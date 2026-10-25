"use server";

import { redirect } from "next/navigation";
import { requerirStaff } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Cupon } from "@/lib/types";

export async function canjearCupon(formData: FormData) {
  const { local, usuario } = await requerirStaff();
  const codigo = String(formData.get("codigo") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const conError = (msg: string) => `/mesero?error=${encodeURIComponent(msg)}`;
  if (!codigo) redirect(conError("Escribí el código"));

  const admin = supabaseAdmin();
  const { data: cuponRaw } = await admin
    .from("cupones")
    .select("*, clientes(nombre)")
    .eq("local_id", local.id)
    .eq("codigo", codigo)
    .maybeSingle();
  if (!cuponRaw) redirect(conError(`No existe un cupón ${codigo}`));
  const cupon = cuponRaw as Cupon & { clientes: { nombre: string } };

  if (cupon.estado === "canjeado") redirect(conError(`El cupón ${codigo} ya fue canjeado`));
  if (cupon.estado !== "activo") redirect(conError(`El cupón ${codigo} está ${cupon.estado}`));
  if (cupon.vence_en && new Date(cupon.vence_en).getTime() < Date.now()) {
    await admin.from("cupones").update({ estado: "vencido" }).eq("id", cupon.id);
    redirect(conError(`El cupón ${codigo} venció`));
  }

  await admin
    .from("cupones")
    .update({ estado: "canjeado", canjeado_en: new Date().toISOString(), canjeado_por: usuario.id })
    .eq("id", cupon.id);

  redirect(`/mesero?ok=${encodeURIComponent(`${cupon.clientes.nombre}: ${cupon.descripcion}`)}`);
}
