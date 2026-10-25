/**
 * Lectura de las variables de Supabase aceptando las dos convenciones:
 *  - la del proyecto (.env.example): NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *  - la de la integración Supabase ↔ Vercel: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (o SUPABASE_ANON_KEY), SUPABASE_SECRET_KEY
 *
 * Todo el acceso a Supabase ocurre en el servidor, así que no dependemos
 * del prefijo NEXT_PUBLIC_ para que las variables estén disponibles.
 */
function primera(...nombres: string[]): string | undefined {
  for (const n of nombres) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

/** URL pública de la app (para los QR), sin barra final. */
export function urlBase(): string {
  const v = primera("NEXT_PUBLIC_APP_URL") ?? (primera("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${primera("VERCEL_PROJECT_PRODUCTION_URL")}` : "http://localhost:3000");
  return v.replace(/\/+$/, "");
}

export function supabaseUrl(): string {
  const v = primera("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
  if (!v) throw new Error("Falta la URL de Supabase: definí NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) en el entorno.");
  return v;
}

export function supabaseClavePublica(): string {
  const v = primera(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
  );
  if (!v) {
    throw new Error(
      "Falta la clave pública de Supabase: definí NEXT_PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_PUBLISHABLE_KEY) en el entorno.",
    );
  }
  return v;
}

export function supabaseClaveServicio(): string {
  const v = primera("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY");
  if (!v) {
    throw new Error(
      "Falta la clave de servicio de Supabase: definí SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY) en el entorno.",
    );
  }
  return v;
}
