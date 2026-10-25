import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseClavePublica, supabaseUrl } from "@/lib/env";

/**
 * Cliente de Supabase ligado a la sesión del usuario (cookies).
 * Se usa para autenticación. Las consultas de datos van por el cliente admin.
 */
export async function crearClienteSesion() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseClavePublica(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: no se pueden escribir cookies.
            // El proxy se encarga de refrescar la sesión.
          }
        },
      },
  });
}
