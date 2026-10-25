"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Baja manual del cliente (pedido por otro canal). */
export async function darDeBaja(formData: FormData) {
  const { local } = await requerirAdmin();
  const id = String(formData.get("id"));
  await supabaseAdmin()
    .from("clientes")
    .update({ consentimiento_marketing: false, opt_out_fecha: new Date().toISOString() })
    .eq("id", id)
    .eq("local_id", local.id);
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

/** Registra una visita manual (por ejemplo, el cliente no escaneó pero el mesero lo reconoce). */
export async function registrarVisitaManual(formData: FormData) {
  const { local } = await requerirAdmin();
  const clienteId = String(formData.get("cliente_id"));
  const totalRaw = String(formData.get("total") ?? "").replace(",", ".");
  const total = totalRaw ? Number(totalRaw) : null;
  await supabaseAdmin().from("visitas").insert({ local_id: local.id, cliente_id: clienteId, origen: "manual", total });
  revalidatePath(`/admin/clientes/${clienteId}`);
}
