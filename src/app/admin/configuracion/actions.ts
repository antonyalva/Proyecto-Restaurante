"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function guardarConfiguracion(formData: FormData) {
  const { local, usuario } = await requerirAdmin();
  if (usuario.rol !== "admin") return;

  const campos = {
    nombre: String(formData.get("nombre") ?? "").trim() || local.nombre,
    pais: String(formData.get("pais") ?? "").trim().toUpperCase() || local.pais,
    zona_horaria: String(formData.get("zona_horaria") ?? "").trim() || local.zona_horaria,
    moneda: String(formData.get("moneda") ?? "").trim().toUpperCase() || local.moneda,
    incentivo_registro: String(formData.get("incentivo_registro") ?? "").trim() || local.incentivo_registro,
    telefono_whatsapp: String(formData.get("telefono_whatsapp") ?? "").trim() || null,
    whatsapp_phone_number_id: String(formData.get("whatsapp_phone_number_id") ?? "").trim() || null,
    costo_mensaje_usd: Number(String(formData.get("costo_mensaje_usd") ?? "").replace(",", ".")) || local.costo_mensaje_usd,
  };

  await supabaseAdmin().from("locales").update(campos).eq("id", local.id);
  revalidatePath("/admin", "layout");
}
