"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function crearMesas(formData: FormData) {
  const { local } = await requerirAdmin();
  const cantidad = Math.min(Math.max(Number(formData.get("cantidad") ?? 1), 1), 100);
  const admin = supabaseAdmin();

  const { data: ultima } = await admin
    .from("mesas")
    .select("numero")
    .eq("local_id", local.id)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const desde = (ultima?.numero ?? 0) + 1;

  const filas = Array.from({ length: cantidad }, (_, i) => ({ local_id: local.id, numero: desde + i }));
  await admin.from("mesas").insert(filas);
  revalidatePath("/admin/mesas");
}

export async function alternarMesa(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const activa = formData.get("activa") === "true";
  await supabaseAdmin().from("mesas").update({ activa: !activa }).eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/mesas");
}

export async function renombrarMesa(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const nombre = String(formData.get("nombre") ?? "").trim() || null;
  await supabaseAdmin().from("mesas").update({ nombre }).eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/mesas");
}

/** Genera un token nuevo: el QR impreso anterior deja de funcionar. */
export async function regenerarToken(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const token = Buffer.from(bytes).toString("base64url");
  await supabaseAdmin().from("mesas").update({ token_qr: token }).eq("id", id).eq("local_id", local.id);
  revalidatePath("/admin/mesas");
}
