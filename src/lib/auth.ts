import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteSesion } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Local, Rol, Usuario } from "@/lib/types";

export type Sesion = { usuario: Usuario; local: Local };

/**
 * Devuelve el usuario del panel y su local, o null si no hay sesión.
 * Cacheado por request para no repetir consultas entre layout y página.
 */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const supabase = await crearClienteSesion();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = supabaseAdmin();
  const { data: usuario } = await admin
    .from("usuarios")
    .select("id, local_id, email, nombre, rol")
    .eq("id", user.id)
    .maybeSingle();
  if (!usuario) return null;

  const { data: local } = await admin
    .from("locales")
    .select("*")
    .eq("id", usuario.local_id)
    .single();
  if (!local) return null;

  return { usuario: usuario as Usuario, local: local as Local };
});

/** Exige sesión con alguno de los roles indicados; redirige si no. */
export async function requerirRol(roles: Rol[]): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (!roles.includes(sesion.usuario.rol)) redirect("/sin-permiso");
  return sesion;
}

export const requerirAdmin = () => requerirRol(["admin", "encargado"]);
export const requerirStaff = () => requerirRol(["admin", "encargado", "mesero"]);
