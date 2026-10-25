import Link from "next/link";
import { EnlaceBoton, Tabla, Td, Th, Titulo, Vacio } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearFecha, formatearUsd } from "@/lib/formato";
import { describirSegmento } from "@/lib/segmentos";
import type { Campana } from "@/lib/types";
import { EstadoCampana } from "@/components/estado-campana";

export default async function Campanas() {
  const { local } = await requerirAdmin();
  const { data } = await supabaseAdmin()
    .from("campanas")
    .select("*, plantillas(nombre)")
    .eq("local_id", local.id)
    .order("creado_en", { ascending: false });
  const campanas = (data ?? []) as (Campana & { plantillas: { nombre: string } | null })[];

  return (
    <>
      <Titulo acciones={<EnlaceBoton href="/admin/campanas/nueva">Nueva campaña</EnlaceBoton>}>Campañas</Titulo>
      {campanas.length === 0 ? (
        <Vacio>Sin campañas todavía. Esperá el momento flojo y mandá la primera.</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Campaña</Th>
              <Th>Segmento</Th>
              <Th>Estado</Th>
              <Th className="text-right">Destinatarios</Th>
              <Th className="text-right">Costo est.</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody>
            {campanas.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/campanas/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                    {c.nombre}
                  </Link>
                  <div className="text-xs text-neutral-500">{c.plantillas?.nombre}</div>
                </Td>
                <Td>{describirSegmento(c.segmento)}</Td>
                <Td>
                  <EstadoCampana estado={c.estado} />
                </Td>
                <Td className="text-right tabular-nums">{c.destinatarios}</Td>
                <Td className="text-right tabular-nums">{formatearUsd(Number(c.costo_estimado))}</Td>
                <Td>{formatearFecha(c.enviada_en ?? c.programada_para ?? c.creado_en, local.zona_horaria)}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
