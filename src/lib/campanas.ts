import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { proveedorWhatsapp } from "@/lib/whatsapp";
import type { Campana, Cliente, Local, Plantilla } from "@/lib/types";

export type ResultadoProceso = {
  procesados: number;
  enviados: number;
  fallidos: number;
  pendientes: number;
  estadoCampana: Campana["estado"];
};

/**
 * Procesa un lote de envíos pendientes de una campaña. Es idempotente:
 * se puede llamar repetidas veces (botón del panel o cron) hasta que no
 * queden pendientes. Respeta el tamaño de lote de WHATSAPP_LOTE.
 */
export async function procesarCampana(campanaId: string, localId: string): Promise<ResultadoProceso> {
  const admin = supabaseAdmin();
  const lote = Number(process.env.WHATSAPP_LOTE ?? 50);

  const { data: campanaRaw } = await admin
    .from("campanas")
    .select("*")
    .eq("id", campanaId)
    .eq("local_id", localId)
    .single();
  if (!campanaRaw) throw new Error("Campaña no encontrada");
  const campana = campanaRaw as Campana;

  if (campana.estado === "cancelada" || campana.estado === "borrador") {
    return { procesados: 0, enviados: 0, fallidos: 0, pendientes: 0, estadoCampana: campana.estado };
  }
  if (campana.programada_para && new Date(campana.programada_para).getTime() > Date.now()) {
    const { count } = await admin
      .from("envios")
      .select("id", { count: "exact", head: true })
      .eq("campana_id", campanaId)
      .eq("estado", "pendiente");
    return { procesados: 0, enviados: 0, fallidos: 0, pendientes: count ?? 0, estadoCampana: campana.estado };
  }

  const [{ data: plantillaRaw }, { data: localRaw }] = await Promise.all([
    admin.from("plantillas").select("*").eq("id", campana.plantilla_id).single(),
    admin.from("locales").select("*").eq("id", localId).single(),
  ]);
  const plantilla = plantillaRaw as Plantilla;
  const local = localRaw as Local;

  const { data: pendientes } = await admin
    .from("envios")
    .select("id, cliente_id, clientes(*)")
    .eq("campana_id", campanaId)
    .eq("estado", "pendiente")
    .limit(lote);

  const filas = (pendientes ?? []) as unknown as { id: string; cliente_id: string; clientes: Cliente }[];

  if (filas.length > 0 && campana.estado !== "enviando") {
    await admin.from("campanas").update({ estado: "enviando" }).eq("id", campanaId);
  }

  const proveedor = proveedorWhatsapp();
  let enviados = 0;
  let fallidos = 0;

  for (const fila of filas) {
    const cliente = fila.clientes;
    // Re-verificar consentimiento al momento del envío (pudo darse de baja).
    if (!cliente || !cliente.consentimiento_marketing || cliente.opt_out_fecha) {
      await admin
        .from("envios")
        .update({ estado: "omitido", error: "Sin consentimiento vigente", actualizado_en: new Date().toISOString() })
        .eq("id", fila.id);
      continue;
    }

    const parametros = plantilla.variables.map((nombre) => resolverVariable(nombre, campana.valores, cliente, local));
    const resultado = await proveedor.enviarPlantilla({
      para: cliente.telefono,
      plantilla: plantilla.nombre_meta,
      idioma: plantilla.idioma,
      parametros,
      phoneNumberId: local.whatsapp_phone_number_id,
    });

    const ahora = new Date().toISOString();
    if (resultado.ok) {
      enviados++;
      await admin
        .from("envios")
        .update({
          estado: proveedor.nombre === "mock" ? "entregado" : "enviado",
          wamid: resultado.wamid,
          enviado_en: ahora,
          actualizado_en: ahora,
        })
        .eq("id", fila.id);
    } else {
      fallidos++;
      await admin
        .from("envios")
        .update({ estado: "fallido", error: resultado.error, actualizado_en: ahora })
        .eq("id", fila.id);
    }
  }

  const { count } = await admin
    .from("envios")
    .select("id", { count: "exact", head: true })
    .eq("campana_id", campanaId)
    .eq("estado", "pendiente");
  const restantes = count ?? 0;

  let estadoCampana = campana.estado;
  if (restantes === 0) {
    estadoCampana = "enviada";
    await admin
      .from("campanas")
      .update({ estado: "enviada", enviada_en: campana.enviada_en ?? new Date().toISOString() })
      .eq("id", campanaId);
  } else if (filas.length > 0) {
    estadoCampana = "enviando";
  }

  return { procesados: filas.length, enviados, fallidos, pendientes: restantes, estadoCampana };
}

/**
 * Variables reservadas que se resuelven por cliente/local; el resto sale
 * de los valores cargados al crear la campaña.
 */
export function resolverVariable(
  nombre: string,
  valores: Record<string, string>,
  cliente: Pick<Cliente, "nombre">,
  local: Pick<Local, "nombre">,
): string {
  if (nombre === "nombre") return primerNombre(cliente.nombre);
  if (nombre === "local") return local.nombre;
  return valores[nombre] ?? "";
}

export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** Variables que el usuario no necesita cargar porque se resuelven solas. */
export const VARIABLES_AUTOMATICAS = ["nombre", "local"];
