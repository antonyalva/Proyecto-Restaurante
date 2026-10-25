import { Alerta, Boton, Campo, Entrada, Seleccion, Tarjeta, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearUsd, renderizarPlantilla } from "@/lib/formato";
import { calcularSegmento, describirSegmento, leerSegmento, SEGMENTOS } from "@/lib/segmentos";
import { VARIABLES_AUTOMATICAS } from "@/lib/campanas";
import type { Plantilla } from "@/lib/types";
import { crearCampana } from "../actions";

export default async function NuevaCampana({
  searchParams,
}: {
  searchParams: Promise<{ plantilla?: string; segmento?: string; dias?: string; error?: string }>;
}) {
  const { local } = await requerirAdmin();
  const sp = await searchParams;
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("plantillas")
    .select("*")
    .eq("local_id", local.id)
    .eq("estado_aprobacion", "aprobada")
    .eq("categoria", "marketing")
    .order("nombre");
  const plantillas = (data ?? []) as Plantilla[];
  const plantilla = plantillas.find((p) => p.id === sp.plantilla) ?? null;
  const segmento = leerSegmento(sp);
  const calculado = Boolean(sp.plantilla);
  const resultado = calculado ? await calcularSegmento(local.id, segmento) : null;
  const costo = resultado ? resultado.destinatarios.length * Number(local.costo_mensaje_usd) : 0;

  const variablesEditables = plantilla ? plantilla.variables.filter((v) => !VARIABLES_AUTOMATICAS.includes(v)) : [];
  const ejemplo = plantilla
    ? renderizarPlantilla(plantilla.cuerpo, plantilla.variables, {
        nombre: "Ana",
        local: local.nombre,
        ...Object.fromEntries(variablesEditables.map((v) => [v, `{${v}}`])),
      })
    : "";

  return (
    <>
      <Titulo>Nueva campaña</Titulo>
      {sp.error && (
        <div className="mb-4">
          <Alerta tipo="error">{sp.error}</Alerta>
        </div>
      )}
      {plantillas.length === 0 && (
        <div className="mb-4">
          <Alerta tipo="info">No hay plantillas de marketing aprobadas. Cargá una en Plantillas.</Alerta>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-semibold">1. Plantilla y segmento</h2>
          <form method="get" className="space-y-3">
            <Campo etiqueta="Plantilla">
              <Seleccion name="plantilla" defaultValue={sp.plantilla ?? ""} required>
                <option value="" disabled>
                  Elegir…
                </option>
                {plantillas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Segmento">
              <Seleccion name="segmento" defaultValue={segmento.tipo}>
                {SEGMENTOS.map((s) => (
                  <option key={s.tipo} value={s.tipo}>
                    {s.etiqueta} · {s.descripcion}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Días (para inactivos o cumpleaños)">
              <Entrada name="dias" type="number" min={1} max={365} defaultValue={segmento.dias ?? 30} />
            </Campo>
            <Boton type="submit" variante="secundario">
              Calcular destinatarios
            </Boton>
          </form>

          {resultado && (
            <div className="mt-5 rounded-lg bg-neutral-50 p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-neutral-600">{describirSegmento(segmento)}</span>
                <span className="text-2xl font-semibold tabular-nums">{resultado.destinatarios.length}</span>
              </div>
              <div className="mt-1 flex justify-between text-neutral-600">
                <span>Costo estimado ({formatearUsd(Number(local.costo_mensaje_usd))} por mensaje)</span>
                <span className="font-medium tabular-nums">{formatearUsd(costo)}</span>
              </div>
              {resultado.excluidosPorFrecuencia > 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  {resultado.excluidosPorFrecuencia} clientes excluidos: ya recibieron 2 campañas esta semana.
                </p>
              )}
            </div>
          )}
        </Tarjeta>

        <Tarjeta className={calculado && plantilla ? "" : "opacity-50"}>
          <h2 className="mb-3 font-semibold">2. Mensaje y envío</h2>
          {plantilla ? (
            <form action={crearCampana} className="space-y-3">
              <input type="hidden" name="plantilla_id" value={plantilla.id} />
              <input type="hidden" name="segmento" value={segmento.tipo} />
              <input type="hidden" name="dias" value={segmento.dias ?? ""} />
              <Campo etiqueta="Nombre de la campaña">
                <Entrada name="nombre" required placeholder="Lunes 17 h · 2x1 café" />
              </Campo>
              {variablesEditables.map((v) => (
                <Campo key={v} etiqueta={`Variable: ${v}`}>
                  <Entrada name={`var_${v}`} required />
                </Campo>
              ))}
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Vista previa</div>
                {ejemplo}
              </div>
              <Campo etiqueta="Programar para (opcional)" ayuda="Vacío = se envía al confirmar.">
                <Entrada name="programada_para" type="datetime-local" />
              </Campo>
              <Boton type="submit" disabled={!resultado || resultado.destinatarios.length === 0}>
                Crear campaña ({resultado?.destinatarios.length ?? 0} destinatarios)
              </Boton>
              <p className="text-xs text-neutral-500">
                La campaña queda lista y se envía desde su página, en lotes. Nada sale hasta que la confirmes ahí.
              </p>
            </form>
          ) : (
            <p className="text-sm text-neutral-500">Elegí una plantilla y calculá los destinatarios primero.</p>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
