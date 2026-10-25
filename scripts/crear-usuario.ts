/**
 * Crea un usuario del panel y lo asigna a un local.
 *
 *   npm run crear-usuario -- --email ana@local.com --password "secreta123" --rol admin --local demo --nombre "Ana"
 *
 * Roles: admin (todo), encargado (panel sin configuración), mesero (solo canje de cupones).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

function arg(nombre: string, porDefecto?: string): string {
  const i = process.argv.indexOf(`--${nombre}`);
  const valor = i >= 0 ? process.argv[i + 1] : undefined;
  if (!valor && porDefecto === undefined) {
    console.error(`Falta --${nombre}`);
    process.exit(1);
  }
  return valor ?? porDefecto!;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
  }

  const email = arg("email");
  const password = arg("password");
  const rol = arg("rol", "admin");
  const slug = arg("local", "demo");
  const nombre = arg("nombre", "");

  if (!["admin", "encargado", "mesero"].includes(rol)) {
    console.error("Rol inválido. Usar admin, encargado o mesero.");
    process.exit(1);
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });

  const { data: local } = await admin.from("locales").select("id, nombre").eq("slug", slug).maybeSingle();
  if (!local) {
    console.error(`No existe un local con slug "${slug}". Ejecutá supabase/seed.sql o creá el local primero.`);
    process.exit(1);
  }

  const { data: creado, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  let userId = creado?.user?.id;
  if (error) {
    if (!/already|exists|registered/i.test(error.message)) {
      console.error("Error creando el usuario:", error.message);
      process.exit(1);
    }
    const { data: lista } = await admin.auth.admin.listUsers({ perPage: 1000 });
    userId = lista?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;
    if (!userId) {
      console.error("El usuario existe pero no se pudo recuperar su id.");
      process.exit(1);
    }
    console.log("El usuario ya existía en Auth; se actualiza su asignación.");
  }

  const { error: errUsuario } = await admin
    .from("usuarios")
    .upsert({ id: userId, local_id: local.id, email, nombre: nombre || null, rol }, { onConflict: "id" });
  if (errUsuario) {
    console.error("Error asignando el usuario al local:", errUsuario.message);
    process.exit(1);
  }

  console.log(`Listo: ${email} (${rol}) asignado a "${local.nombre}".`);
}

main();
