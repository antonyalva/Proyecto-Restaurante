import Link from "next/link";
import { notFound } from "next/navigation";
import { Alerta, Boton, EnlaceBoton, Insignia, Kpi, Tabla, Tarjeta, Td, Th, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { esFuturo, formatearFecha, formatearUsd, renderizarPlantilla } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import { describirSegmento } from "@/lib/segmentos";
import type { Campana, Envio, Plantilla } from "@/lib/types";
import { EstadoCampana } from "@/components/estado-campana";
import { cancelarCampana, procesarLote } from "../actions";

export default async function DetalleCampana({ params }: { params: Promise<{ id: string }> }) {
  const { local } = await requerirAdmin();
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: campanaRaw } = await admin
    .from("campanas")
    .select("*, plantillas(*)")
    .eq("id", id)
    .eq("local_id", local.id)
    .maybeSingle();
  if (!campanaRaw) notFound();
  const campana = campanaRaw as Campana & { plantillas: Plantilla };

  const [{ data: enviosRaw }, { count: visitasAtribuidas }] = await Promise.all([
    admin
      .from("envios")
      .select("*, clientes(nombre, telefono)")
      .eq("campana_id", id)
      .order("actualizado_en", { ascending: false })
      .limit(500),
    admin.from("visitas").select("id", { count: "exact", head: true }).eq("campana_id", id),
  ]);
  const envios = (enviosRaw ?? []) as (Envio & { clientes: { nombre: string; telefono: string } })[];

  const conteo = (estado: Envio["estado"]) => envios.filter((e) => e.estado === estado).length;
  const pendientes = conteo("pendiente");
  const entregados = conteo("entregado") + conteo("leido");
  const lote = Number(process.env.WHATSAPP_LOTE ?? 50);
  const programadaFutura = esFuturo(campana.programada_para);
  const puedeEnviar = (campana.estado === "lista" || campana.estado === "enviando") && pendientes > 0;

  const mensaje = renderizarPlantilla(campana.plantillas.cuerpo, campana.plantillas.variables, {
    nombre: "Ana",
    local: local.nombre,
    ...campana.valores,
  });

  return (
    <>
      <Titulo
        acciones={
          <EnlaceBoton href="/admin/campanas" variante="secundario">
            Volver
          </EnlaceBoton>
        }
      >
        {campana.nombre}
      </Titulo>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi etiqueta="Destinatarios" valor={campana.destinatarios} detalle={describirSegmento(campana.segmento)} />
        <Kpi etiqueta="Entregados" valor={entregados} detalle={`${conteo("leido")} leídos · ${conteo("fallido")} fallidos`} />
        <Kpi etiqueta="Pendientes" valor={pendientes} detalle={`${conteo("omitido")} omitidos`} />
        <Kpi etiqueta="Visitas atribuidas" valor={visitasAtribuidas ?? 0} detalle="Escaneos dentro de las 48 h" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <div className="mb-2 flex items-center gap-2">
            <EstadoCampana estado={campana.estado} />
            <span className="text-xs text-neutral-500">
              creada {formatearFecha(campana.creado_en, local.zona_horaria)}
              {campana.enviada_en && ` · enviada ${formatearFecha(campana.enviada_en, local.zona_horaria)}`}
            </span>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">{mensaje}</div>
          <p className="mt-2 text-xs text-neutral-500">
            Plantilla {campana.plantillas.nombre_meta} · costo estimado {formatearUsd(Number(campana.costo_estimado))}
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-semibold">Envío</h2>
          {programadaFutura && (
            <div className="mb-3">
              <Alerta tipo="info">
                Programada para {formatearFecha(campana.programada_para, local.zona_horaria)}. El cron la procesará a esa
                hora; también podés forzarla antes desde acá.
              </Alerta>
            </div>
          )}
          {puedeEnviar ? (
            <form action={procesarLote} className="space-y-2">
              <input type="hidden" name="id" value={campana.id} />
              <Boton type="submit">Enviar siguiente lote ({Math.min(lote, pendientes)} mensajes)</Boton>
              <p className="text-xs text-neutral-500">
                Se envía en lotes de {lote} para respetar los límites de WhatsApp. Repetí hasta que no queden pendientes,
                o dejá que el cron lo termine.
              </p>
            </form>
          ) : (
            <p className="text-sm text-neutral-600">
              {campana.estado === "enviada" ? "Campaña completada." : "No hay envíos pendientes."}
            </p>
          )}
          {(campana.estado === "lista" || campana.estado === "enviando") && (
            <form action={cancelarCampana} className="mt-4">
              <input type="hidden" name="id" value={campana.id} />
              <Boton type="submit" variante="secundario" className="text-red-700">
                Cancelar pendientes
              </Boton>
            </form>
          )}
        </Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Destinatarios</h2>
      <Tabla>
        <thead>
          <tr>
            <Th>Cliente</Th>
            <Th>Teléfono</Th>
            <Th>Estado</Th>
            <Th>Enviado</Th>
          </tr>
        </thead>
        <tbody>
          {envios.map((e) => (
            <tr key={e.id}>
              <Td>
                <Link href={`/admin/clientes/${e.cliente_id}`} className="underline-offset-2 hover:underline">
                  {e.clientes?.nombre}
                </Link>
              </Td>
              <Td className="font-mono text-xs">{e.clientes ? formatearTelefono(e.clientes.telefono) : "—"}</Td>
              <Td>
                <Insignia
                  tono={
                    e.estado === "fallido" ? "rojo" : e.estado === "pendiente" ? "gris" : e.estado === "omitido" ? "amarillo" : "verde"
                  }
                >
                  {e.estado}
                </Insignia>
                {e.error && <span className="ml-2 text-xs text-red-700">{e.error}</span>}
              </Td>
              <Td>{formatearFecha(e.enviado_en, local.zona_horaria)}</Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </>
  );
}
