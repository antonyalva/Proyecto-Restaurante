import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instancia: SupabaseClient | null = null;

/**
 * Cliente con la clave de servicio. Solo en el servidor.
 * Salta RLS: toda consulta debe filtrar por local_id explícitamente.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!instancia) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.",
      );
    }
    instancia = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instancia;
}
