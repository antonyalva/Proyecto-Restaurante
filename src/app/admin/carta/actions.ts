"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function crearProducto(formData: FormData) {
  const { local } = await requerirAdmin();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const precioRaw = String(formData.get("precio") ?? "").replace(",", ".");
  const precio = precioRaw ? Number(precioRaw) : null;
  const orden = Number(formData.get("orden") ?? 0);
  if (!categoria || !nombre) return;

  await supabaseAdmin().from("productos").insert({ local_id: local.id, categoria, nombre, descripcion, precio, orden });
  revalidatePath("/admin/carta");
}

export async function alternarDisponible(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const disponible = formData.get("disponible") === "true";
  await supabaseAdmin().from("productos").update({ disponible: !disponible }).eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/carta");
}

export async function eliminarProducto(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin().from("productos").delete().eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/carta");
}
