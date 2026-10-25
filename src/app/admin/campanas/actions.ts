"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { calcularSegmento, leerSegmento } from "@/lib/segmentos";
import { procesarCampana, VARIABLES_AUTOMATICAS } from "@/lib/campanas";
import type { Plantilla } from "@/lib/types";

export async function crearCampana(formData: FormData) {
  const { local, usuario } = await requerirAdmin();
  const admin = supabaseAdmin();

  const plantillaId = String(formData.get("plantilla_id") ?? "");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const segmento = leerSegmento({
    segmento: String(formData.get("segmento") ?? ""),
    dias: String(formData.get("dias") ?? ""),
  });
  const programadaRaw = String(formData.get("programada_para") ?? "").trim();

  const { data: plantillaRaw } = await admin
    .from("plantillas")
    .select("*")
    .eq("id", plantillaId)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!plantillaRaw) redirect("/admin/campanas/nueva?error=Elegí una plantilla");
  const plantilla = plantillaRaw as Plantilla;
  if (plantilla.estado_aprobacion !== "aprobada") redirect("/admin/campanas/nueva?error=La plantilla no está aprobada en Meta");
  if (!nombre) redirect("/admin/campanas/nueva?error=Ponele un nombre a la campaña");

  const valores: Record<string, string> = {};
  for (const v of plantilla.variables) {
    if (VARIABLES_AUTOMATICAS.includes(v)) continue;
    const valor = String(formData.get(`var_${v}`) ?? "").trim();
    if (!valor) redirect(`/admin/campanas/nueva?error=Completá la variable "${v}"`);
    valores[v] = valor;
  }

  const { destinatarios } = await calcularSegmento(local.id, segmento);
  if (destinatarios.length === 0) redirect("/admin/campanas/nueva?error=El segmento no tiene destinatarios");

  const programada_para = programadaRaw ? new Date(programadaRaw).toISOString() : null;

  const { data: campana, error } = await admin
    .from("campanas")
    .insert({
      local_id: local.id,
      plantilla_id: plantilla.id,
      nombre,
      segmento,
      valores,
      programada_para,
      estado: "lista",
      destinatarios: destinatarios.length,
      costo_estimado: destinatarios.length * Number(local.costo_mensaje_usd),
      creada_por: usuario.id,
    })
    .select("id")
    .single();
  if (error || !campana) redirect("/admin/campanas/nueva?error=No se pudo crear la campaña");

  const envios = destinatarios.map((c) => ({
    local_id: local.id,
    campana_id: campana.id,
    cliente_id: c.id,
    tipo: "campana",
    estado: "pendiente",
  }));
  for (let i = 0; i < envios.length; i += 500) {
    await admin.from("envios").insert(envios.slice(i, i + 500));
  }

  revalidatePath("/admin/campanas");
  redirect(`/admin/campanas/${campana.id}`);
}

export async function procesarLote(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  await procesarCampana(id, local.id);
  revalidatePath(`/admin/campanas/${id}`);
}

export async function cancelarCampana(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const admin = supabaseAdmin();
  await admin.from("campanas").update({ estado: "cancelada" }).eq("id", id).eq("local_id", local.id);
  await admin
    .from("envios")
    .update({ estado: "omitido", error: "Campaña cancelada" })
    .eq("campana_id", id)
    .eq("estado", "pendiente");
  revalidatePath(`/admin/campanas/${id}`);
  revalidatePath("/admin/campanas");
}
