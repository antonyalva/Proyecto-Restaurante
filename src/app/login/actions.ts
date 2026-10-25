"use server";

import { redirect } from "next/navigation";
import { crearClienteSesion } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function iniciarSesion(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const volver = String(formData.get("volver") ?? "");

  const conError = (msg: string) => `/login?error=${encodeURIComponent(msg)}`;

  if (!email || !password) {
    redirect(conError("Completá email y contraseña"));
  }

  const supabase = await crearClienteSesion();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const detalle = error && !/invalid login credentials/i.test(error.message) ? ` (${error.message})` : "";
    redirect(conError(`Email o contraseña incorrectos${detalle}`));
  }

  const { data: usuario } = await supabaseAdmin()
    .from("usuarios")
    .select("rol")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!usuario) {
    await supabase.auth.signOut();
    redirect(conError("El usuario no está asignado a ningún local"));
  }

  if (volver.startsWith("/")) redirect(volver);
  redirect(usuario.rol === "mesero" ? "/mesero" : "/admin");
}

export async function cerrarSesion() {
  const supabase = await crearClienteSesion();
  await supabase.auth.signOut();
  redirect("/login");
}
