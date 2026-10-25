import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mapearEstadoMeta } from "@/lib/whatsapp";

/**
 * Webhook de WhatsApp Cloud API.
 * GET: verificación inicial que hace Meta al registrar la URL.
 * POST: estados de entrega (sent/delivered/read/failed) y mensajes entrantes (BAJA).
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  if (sp.get("hub.mode") === "subscribe" && sp.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(sp.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

type Payload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
        messages?: {
          from: string;
          type: string;
          text?: { body?: string };
          button?: { payload?: string; text?: string };
          interactive?: { button_reply?: { id?: string; title?: string } };
        }[];
      };
    }[];
  }[];
};

export async function POST(request: NextRequest) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ahora = new Date().toISOString();

  for (const entry of payload.entry ?? []) {
    for (const cambio of entry.changes ?? []) {
      const valor = cambio.value;
      if (!valor) continue;

      const phoneNumberId = valor.metadata?.phone_number_id ?? null;
      let localId: string | null = null;
      if (phoneNumberId) {
        const { data: local } = await admin.from("locales").select("id").eq("whatsapp_phone_number_id", phoneNumberId).maybeSingle();
        localId = local?.id ?? null;
      }

      await admin.from("eventos_webhook").insert({ local_id: localId, payload: valor });

      for (const s of valor.statuses ?? []) {
        const estado = mapearEstadoMeta(s.status);
        if (!estado) continue;
        const error = s.errors?.[0] ? `${s.errors[0].title ?? ""} ${s.errors[0].message ?? ""}`.trim() : null;
        // No retroceder: un "leído" no vuelve a "entregado" si llegan desordenados.
        const orden = ["enviado", "entregado", "leido"];
        const { data: envio } = await admin.from("envios").select("id, estado").eq("wamid", s.id).maybeSingle();
        if (!envio) continue;
        if (estado !== "fallido" && orden.indexOf(envio.estado) > orden.indexOf(estado)) continue;
        await admin.from("envios").update({ estado, error, actualizado_en: ahora }).eq("id", envio.id);
      }

      for (const m of valor.messages ?? []) {
        const texto =
          m.text?.body ?? m.button?.payload ?? m.button?.text ?? m.interactive?.button_reply?.id ?? m.interactive?.button_reply?.title ?? "";
        if (!/^\s*(baja|stop|salir|no\s*m[aá]s)\s*$/i.test(texto)) continue;
        const telefono = `+${m.from.replace(/\D/g, "")}`;
        let consulta = admin
          .from("clientes")
          .update({ consentimiento_marketing: false, opt_out_fecha: ahora })
          .eq("telefono", telefono);
        if (localId) consulta = consulta.eq("local_id", localId);
        await consulta;
      }
    }
  }

  return NextResponse.json({ ok: true });
}
