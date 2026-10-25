import Link from "next/link";
import { notFound } from "next/navigation";
import { Boton, Campo, EnlaceBoton, Entrada, Insignia, Tabla, Tarjeta, Td, Th, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { diasDesde, formatearDia, formatearDinero, formatearFecha } from "@/lib/formato";
import { formatearTelefono } from "@/lib/telefono";
import type { Cliente, Cupon, Envio, Visita } from "@/lib/types";
import { darDeBaja, registrarVisitaManual } from "../actions";

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { local } = await requerirAdmin();
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: clienteRaw } = await admin.from("clientes").select("*").eq("id", id).eq("local_id", local.id).maybeSingle();
  if (!clienteRaw) notFound();
  const cliente = clienteRaw as Cliente;

  const [{ data: visitasRaw }, { data: cuponesRaw }, { data: enviosRaw }] = await Promise.all([
    admin.from("visitas").select("*, mesas(numero, nombre)").eq("cliente_id", id).order("inicio", { ascending: false }).limit(50),
    admin.from("cupones").select("*").eq("cliente_id", id).order("creado_en", { ascending: false }),
    admin
      .from("envios")
      .select("*, campanas(nombre)")
      .eq("cliente_id", id)
      .order("actualizado_en", { ascending: false })
      .limit(30),
  ]);
  const visitas = (visitasRaw ?? []) as (Visita & { mesas: { numero: number; nombre: string | null } | null })[];
  const cupones = (cuponesRaw ?? []) as Cupon[];
  const envios = (enviosRaw ?? []) as (Envio & { campanas: { nombre: string } | null })[];
  const gasto = visitas.reduce((s, v) => s + (v.total ?? 0), 0);
  const vigente = cliente.consentimiento_marketing && !cliente.opt_out_fecha;

  return (
    <>
      <Titulo acciones={<EnlaceBoton href="/admin/clientes" variante="secundario">Volver</EnlaceBoton>}>{cliente.nombre}</Titulo>

      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-neutral-500">Teléfono</dt>
              <dd className="font-mono">{formatearTelefono(cliente.telefono)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Cumpleaños</dt>
              <dd>{cliente.fecha_nacimiento ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Alta</dt>
              <dd>{formatearFecha(cliente.creado_en, local.zona_horaria)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Consentimiento</dt>
              <dd>
                {vigente ? <Insignia tono="verde">vigente</Insignia> : <Insignia tono="rojo">baja</Insignia>}
                {cliente.consentimiento_fecha && (
                  <span className="ml-2 text-xs text-neutral-500">
                    aceptado {formatearDia(cliente.consentimiento_fecha, local.zona_horaria)}
                  </span>
                )}
              </dd>
            </div>
          </dl>
          {vigente && (
            <form action={darDeBaja} className="mt-4">
              <input type="hidden" name="id" value={cliente.id} />
              <Boton type="submit" variante="secundario" className="text-red-700">
                Dar de baja
              </Boton>
            </form>
          )}
        </Tarjeta>

        <Tarjeta>
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Visitas</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{visitas.length}</div>
          <div className="text-xs text-neutral-500">
            Última: {visitas[0] ? `hace ${diasDesde(visitas[0].inicio)} días` : "—"}
          </div>
          <div className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">Gasto registrado</div>
          <div className="text-xl font-semibold tabular-nums">{formatearDinero(gasto, local.moneda)}</div>
        </Tarjeta>

        <Tarjeta>
          <form action={registrarVisitaManual} className="space-y-3">
            <input type="hidden" name="cliente_id" value={cliente.id} />
            <Campo etiqueta="Registrar visita manual" ayuda="Opcional: total del ticket.">
              <Entrada name="total" type="number" step="0.01" min={0} placeholder={`Total en ${local.moneda}`} />
            </Campo>
            <Boton type="submit" variante="secundario">
              Registrar visita
            </Boton>
          </form>
        </Tarjeta>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Historial de visitas</h2>
          <Tabla>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Mesa</Th>
                <Th>Origen</Th>
                <Th className="text-right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.id}>
                  <Td>{formatearFecha(v.inicio, local.zona_horaria)}</Td>
                  <Td>{v.mesas ? (v.mesas.nombre ?? v.mesas.numero) : "—"}</Td>
                  <Td>
                    {v.origen}
                    {v.campana_id && (
                      <Link href={`/admin/campanas/${v.campana_id}`} className="ml-2 text-xs underline">
                        por campaña
                      </Link>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">{formatearDinero(v.total, local.moneda)}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Cupones</h2>
            <Tabla>
              <thead>
                <tr>
                  <Th>Código</Th>
                  <Th>Descripción</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {cupones.map((c) => (
                  <tr key={c.id}>
                    <Td className="font-mono">{c.codigo}</Td>
                    <Td>{c.descripcion}</Td>
                    <Td>
                      <Insignia tono={c.estado === "canjeado" ? "verde" : c.estado === "activo" ? "azul" : "gris"}>{c.estado}</Insignia>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Mensajes</h2>
            <Tabla>
              <thead>
                <tr>
                  <Th>Fecha</Th>
                  <Th>Tipo</Th>
                  <Th>Estado</Th>
                </tr>
              </thead>
              <tbody>
                {envios.map((e) => (
                  <tr key={e.id}>
                    <Td>{formatearFecha(e.enviado_en, local.zona_horaria)}</Td>
                    <Td>{e.campanas?.nombre ?? e.tipo}</Td>
                    <Td>
                      <Insignia tono={e.estado === "fallido" ? "rojo" : e.estado === "pendiente" ? "gris" : "verde"}>{e.estado}</Insignia>
                      {e.error && <span className="ml-2 text-xs text-red-700">{e.error}</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </div>
        </div>
      </section>
    </>
  );
}
