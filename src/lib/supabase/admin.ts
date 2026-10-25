import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseClaveServicio, supabaseUrl } from "@/lib/env";

let instancia: SupabaseClient | null = null;

/**
 * Cliente con la clave de servicio. Solo en el servidor.
 * Salta RLS: toda consulta debe filtrar por local_id explícitamente.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!instancia) {
    instancia = createClient(supabaseUrl(), supabaseClaveServicio(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return instancia;
}
