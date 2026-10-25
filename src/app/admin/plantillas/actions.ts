"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function crearPlantilla(formData: FormData) {
  const { local } = await requerirAdmin();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nombre_meta = String(formData.get("nombre_meta") ?? "").trim().toLowerCase();
  const idioma = String(formData.get("idioma") ?? "es").trim();
  const categoria = String(formData.get("categoria") ?? "marketing");
  const cuerpo = String(formData.get("cuerpo") ?? "").trim();
  const variables = String(formData.get("variables") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const estado_aprobacion = String(formData.get("estado_aprobacion") ?? "pendiente");
  if (!nombre || !nombre_meta || !cuerpo) return;

  await supabaseAdmin()
    .from("plantillas")
    .upsert(
      { local_id: local.id, nombre, nombre_meta, idioma, categoria, cuerpo, variables, estado_aprobacion },
      { onConflict: "local_id,nombre_meta,idioma" },
    );
  revalidatePath("/admin/plantillas");
}

export async function cambiarAprobacion(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const estado_aprobacion = String(formData.get("estado_aprobacion"));
  await supabaseAdmin().from("plantillas").update({ estado_aprobacion }).eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/plantillas");
}

export async function eliminarPlantilla(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin().from("plantillas").delete().eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/plantillas");
}
