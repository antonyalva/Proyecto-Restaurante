"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizarTelefono } from "@/lib/telefono";
import { generarCodigoCupon } from "@/lib/formato";
import { proveedorWhatsapp } from "@/lib/whatsapp";
import { TEXTO_CONSENTIMIENTO } from "@/lib/consentimiento";
import type { Cliente, Local, Mesa, Plantilla } from "@/lib/types";

/** Ventana en la que un nuevo escaneo del mismo cliente no genera otra visita. */
const VENTANA_VISITA_MS = 2 * 60 * 60 * 1000;

export async function registrarCliente(token: string, formData: FormData) {
  const admin = supabaseAdmin();

  const { data: mesaRaw } = await admin
    .from("mesas")
    .select("*, locales(*)")
    .eq("token_qr", token)
    .eq("activa", true)
    .maybeSingle();
  if (!mesaRaw) redirect("/");
  const mesa = mesaRaw as unknown as Mesa & { locales: Local };
  const local = mesa.locales;

  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefonoEntrada = String(formData.get("telefono") ?? "");
  const cumpleanos = String(formData.get("cumpleanos") ?? "").trim();
  const consentimiento = formData.get("consentimiento") === "on";

  function volver(msg: string): never {
    redirect(`/m/${encodeURIComponent(token)}?error=${encodeURIComponent(msg)}#club`);
  }

  if (nombre.length < 2 || nombre.length > 80) volver("Escribí tu nombre.");
  const telefono = normalizarTelefono(telefonoEntrada, local.pais);
  if (!telefono) volver("El teléfono no parece válido. Revisá el número.");
  if (!consentimiento) volver("Necesitamos tu permiso para enviarte mensajes.");
  if (cumpleanos && !/^\d{4}-\d{2}-\d{2}$/.test(cumpleanos)) volver("La fecha de cumpleaños no es válida.");

  const ahora = new Date().toISOString();

  const { data: existenteRaw } = await admin
    .from("clientes")
    .select("*")
    .eq("local_id", local.id)
    .eq("telefono", telefono)
    .maybeSingle();
  const existente = existenteRaw as Cliente | null;

  let cliente: Cliente;
  let esNuevo = false;

  if (existente) {
    cliente = existente;
    // Si se había dado de baja y vuelve a aceptar, reactivar consentimiento.
    if (!existente.consentimiento_marketing || existente.opt_out_fecha) {
      await admin
        .from("clientes")
        .update({
          consentimiento_marketing: true,
          consentimiento_fecha: ahora,
          consentimiento_texto: TEXTO_CONSENTIMIENTO,
          opt_out_fecha: null,
          fecha_nacimiento: existente.fecha_nacimiento ?? (cumpleanos || null),
        })
        .eq("id", existente.id);
    } else if (!existente.fecha_nacimiento && cumpleanos) {
      await admin.from("clientes").update({ fecha_nacimiento: cumpleanos }).eq("id", existente.id);
    }
  } else {
    const { data: creado, error } = await admin
      .from("clientes")
      .insert({
        local_id: local.id,
        telefono,
        nombre,
        fecha_nacimiento: cumpleanos || null,
        consentimiento_marketing: true,
        consentimiento_fecha: ahora,
        consentimiento_texto: TEXTO_CONSENTIMIENTO,
        origen: "qr",
        mesa_registro_id: mesa.id,
      })
      .select("*")
      .single();
    if (error || !creado) volver("No pudimos registrarte. Probá de nuevo.");
    cliente = creado as Cliente;
    esNuevo = true;
  }

  // Visita: una por ventana de 2 h para no duplicar con re-escaneos.
  const desde = new Date(Date.now() - VENTANA_VISITA_MS).toISOString();
  const { count: visitasRecientes } = await admin
    .from("visitas")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", cliente.id)
    .gte("inicio", desde);
  if (!visitasRecientes) {
    const campanaId = await campanaAtribuible(cliente.id, local.id);
    await admin.from("visitas").insert({
      local_id: local.id,
      cliente_id: cliente.id,
      mesa_id: mesa.id,
      origen: "qr",
      campana_id: campanaId,
    });
  }

  if (!esNuevo) {
    redirect(`/m/${encodeURIComponent(token)}/bienvenida?ya=1`);
  }

  // Cupón de bienvenida (un solo uso, vence en 30 días).
  const codigo = generarCodigoCupon();
  const vence = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await admin.from("cupones").insert({
    local_id: local.id,
    cliente_id: cliente.id,
    tipo: "bienvenida",
    descripcion: local.incentivo_registro,
    codigo,
    vence_en: vence,
  });

  await enviarBienvenida(local, cliente, codigo);

  redirect(`/m/${encodeURIComponent(token)}/bienvenida?c=${codigo}`);
}

/** Si el cliente recibió una campaña en las últimas 48 h, la visita se le atribuye. */
async function campanaAtribuible(clienteId: string, localId: string): Promise<string | null> {
  const hace48 = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const { data } = await supabaseAdmin()
    .from("envios")
    .select("campana_id")
    .eq("local_id", localId)
    .eq("cliente_id", clienteId)
    .eq("tipo", "campana")
    .in("estado", ["enviado", "entregado", "leido"])
    .gte("enviado_en", hace48)
    .order("enviado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.campana_id as string | undefined) ?? null;
}

async function enviarBienvenida(local: Local, cliente: Cliente, codigo: string) {
  const admin = supabaseAdmin();
  const { data: plantillaRaw } = await admin
    .from("plantillas")
    .select("*")
    .eq("local_id", local.id)
    .eq("nombre_meta", "bienvenida_club")
    .maybeSingle();
  if (!plantillaRaw) return; // el local no configuró plantilla de bienvenida
  const plantilla = plantillaRaw as Plantilla;

  const valores: Record<string, string> = {
    nombre: cliente.nombre.split(/\s+/)[0],
    local: local.nombre,
    codigo,
  };
  const parametros = plantilla.variables.map((v) => valores[v] ?? "");

  const resultado = await proveedorWhatsapp().enviarPlantilla({
    para: cliente.telefono,
    plantilla: plantilla.nombre_meta,
    idioma: plantilla.idioma,
    parametros,
    phoneNumberId: local.whatsapp_phone_number_id,
  });

  const ahora = new Date().toISOString();
  await admin.from("envios").insert({
    local_id: local.id,
    cliente_id: cliente.id,
    tipo: "bienvenida",
    estado: resultado.ok ? "enviado" : "fallido",
    wamid: resultado.ok ? resultado.wamid : null,
    error: resultado.ok ? null : resultado.error,
    enviado_en: resultado.ok ? ahora : null,
  });
}
