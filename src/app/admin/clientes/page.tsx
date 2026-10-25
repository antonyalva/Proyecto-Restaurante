import Link from "next/link";
import { Boton, Entrada, Insignia, Tabla, Td, Th, Titulo, Vacio } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearDia, formatearFecha } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { Cliente } from "@/lib/types";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { local } = await requerirAdmin();
  const { q } = await searchParams;
  const admin = supabaseAdmin();

  let consulta = admin.from("clientes").select("*").eq("local_id", local.id).order("creado_en", { ascending: false }).limit(300);
  if (q?.trim()) {
    const termino = q.trim().replace(/[%_]/g, "");
    consulta = consulta.or(`nombre.ilike.%${termino}%,telefono.ilike.%${termino}%`);
  }
  const { data } = await consulta;
  const clientes = (data ?? []) as Cliente[];

  const ids = clientes.map((c) => c.id);
  const ultimaVisita = new Map<string, string>();
  const visitasTotales = new Map<string, number>();
  if (ids.length > 0) {
    const { data: visitas } = await admin
      .from("visitas")
      .select("cliente_id, inicio")
      .in("cliente_id", ids)
      .order("inicio", { ascending: false });
    for (const v of (visitas ?? []) as { cliente_id: string; inicio: string }[]) {
      if (!ultimaVisita.has(v.cliente_id)) ultimaVisita.set(v.cliente_id, v.inicio);
      visitasTotales.set(v.cliente_id, (visitasTotales.get(v.cliente_id) ?? 0) + 1);
    }
  }

  return (
    <>
      <Titulo>Clientes</Titulo>
      <form className="mb-4 flex max-w-md gap-2">
        <Entrada name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre o teléfono" />
        <Boton type="submit" variante="secundario">
          Buscar
        </Boton>
      </form>

      {clientes.length === 0 ? (
        <Vacio>Todavía no hay clientes registrados. Imprimí los QR y ponelos en las mesas.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Teléfono</Th>
              <Th className="text-right">Visitas</Th>
              <Th>Última visita</Th>
              <Th>Consentimiento</Th>
              <Th>Alta</Th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/clientes/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                    {c.nombre}
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{formatearTelefono(c.telefono)}</Td>
                <Td className="text-right tabular-nums">{visitasTotales.get(c.id) ?? 0}</Td>
                <Td>{formatearFecha(ultimaVisita.get(c.id), local.zona_horaria)}</Td>
                <Td>
                  {c.consentimiento_marketing && !c.opt_out_fecha ? (
                    <Insignia tono="verde">vigente</Insignia>
                  ) : (
                    <Insignia tono="rojo">baja</Insignia>
                  )}
                </Td>
                <Td>{formatearDia(c.creado_en, local.zona_horaria)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
