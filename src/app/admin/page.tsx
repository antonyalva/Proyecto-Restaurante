import Link from "next/link";
import { EnlaceBoton, Kpi, Tabla, Td, Th, Titulo, Vacio } from "@/components/ui";
import { EstadoCampana } from "@/components/estado-campana";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearFecha, isoHace } from "@/lib/formato";
import type { Campana } from "@/lib/types";

export default async function Resumen() {
  const { local } = await requerirAdmin();
  const admin = supabaseAdmin();

  const hace7 = isoHace(7 * 86_400_000);
  const hace14 = isoHace(14 * 86_400_000);
  const hace48h = isoHace(48 * 3_600_000);

  const [
    { count: totalClientes },
    { count: activos },
    { count: nuevos7 },
    { data: registros14 },
    { data: visitasRecientes },
    { count: cuponesActivos },
    { data: campanasRaw },
  ] = await Promise.all([
    admin.from("clientes").select("id", { count: "exact", head: true }).eq("local_id", local.id),
    admin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("local_id", local.id)
      .eq("consentimiento_marketing", true)
      .is("opt_out_fecha", null),
    admin.from("clientes").select("id", { count: "exact", head: true }).eq("local_id", local.id).gte("creado_en", hace7),
    admin.from("clientes").select("creado_en").eq("local_id", local.id).gte("creado_en", hace14),
    admin.from("visitas").select("inicio").eq("local_id", local.id).gte("inicio", hace48h),
    admin.from("cupones").select("id", { count: "exact", head: true }).eq("local_id", local.id).eq("estado", "activo"),
    admin.from("campanas").select("*").eq("local_id", local.id).order("creado_en", { ascending: false }).limit(5),
  ]);

  const dia = (iso: string) => new Intl.DateTimeFormat("sv", { timeZone: local.zona_horaria, dateStyle: "short" }).format(new Date(iso));
  const hoy = dia(isoHace(0));
  const visitasHoy = ((visitasRecientes ?? []) as { inicio: string }[]).filter((v) => dia(v.inicio) === hoy).length;

  const porDia = new Map<string, number>();
  for (let i = 13; i >= 0; i--) porDia.set(dia(isoHace(i * 86_400_000)), 0);
  for (const r of (registros14 ?? []) as { creado_en: string }[]) {
    const d = dia(r.creado_en);
    if (porDia.has(d)) porDia.set(d, (porDia.get(d) ?? 0) + 1);
  }
  const promedioDiario = ((nuevos7 ?? 0) / 7).toFixed(1);
  const campanas = (campanasRaw ?? []) as Campana[];

  return (
    <>
      <Titulo acciones={<EnlaceBoton href="/admin/campanas/nueva">Nueva campaña</EnlaceBoton>}>Resumen</Titulo>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi etiqueta="Clientes en la base" valor={totalClientes ?? 0} detalle={`${activos ?? 0} con consentimiento vigente`} />
        <Kpi etiqueta="Registros últimos 7 días" valor={nuevos7 ?? 0} detalle={`${promedioDiario} por día · referencia del modelo: 11`} />
        <Kpi etiqueta="Visitas hoy" valor={visitasHoy} detalle="Escaneos con registro" />
        <Kpi etiqueta="Cupones sin canjear" valor={cuponesActivos ?? 0} detalle="Regalos de bienvenida pendientes" />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Registros por día (14 días)</h2>
          <Tabla>
            <thead>
              <tr>
                <Th>Día</Th>
                <Th className="text-right">Registros</Th>
              </tr>
            </thead>
            <tbody>
              {[...porDia.entries()].map(([d, n]) => (
                <tr key={d}>
                  <Td>{d}</Td>
                  <Td className="text-right tabular-nums">{n}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Últimas campañas</h2>
          {campanas.length === 0 ? (
            <Vacio>
              Todavía no enviaste campañas.{" "}
              <Link href="/admin/campanas/nueva" className="underline">
                Crear la primera
              </Link>
            </Vacio>
          ) : (
            <Tabla>
              <thead>
                <tr>
                  <Th>Campaña</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Destinatarios</Th>
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
                    </Td>
                    <Td>
                      <EstadoCampana estado={c.estado} />
                    </Td>
                    <Td className="text-right tabular-nums">{c.destinatarios}</Td>
                    <Td>{formatearFecha(c.enviada_en ?? c.programada_para ?? c.creado_en, local.zona_horaria)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          )}
        </div>
      </section>
    </>
  );
}
