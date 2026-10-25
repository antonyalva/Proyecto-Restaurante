import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { procesarCampana } from "@/lib/campanas";

/**
 * Procesa un lote de cada campaña lista o en envío cuya hora ya llegó.
 * Pensado para un cron externo (Vercel Cron, GitHub Actions, cron-job.org):
 *   POST /api/campanas/procesar  con header  x-cron-secret: $CRON_SECRET
 */
export async function POST(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  const recibido = request.headers.get("x-cron-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secreto || recibido !== secreto) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const ahora = new Date().toISOString();
  const { data } = await admin
    .from("campanas")
    .select("id, local_id, nombre")
    .in("estado", ["lista", "enviando"])
    .or(`programada_para.is.null,programada_para.lte.${ahora}`)
    .limit(20);

  const resultados = [];
  for (const c of (data ?? []) as { id: string; local_id: string; nombre: string }[]) {
    try {
      const r = await procesarCampana(c.id, c.local_id);
      resultados.push({ id: c.id, nombre: c.nombre, ...r });
    } catch (e) {
      resultados.push({ id: c.id, nombre: c.nombre, error: e instanceof Error ? e.message : "error" });
    }
  }

  return NextResponse.json({ ok: true, procesadas: resultados.length, resultados });
}

export const GET = POST;
