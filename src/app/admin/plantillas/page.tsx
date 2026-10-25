import { Alerta, AreaTexto, Boton, Campo, Entrada, Insignia, Seleccion, Tabla, Tarjeta, Td, Th, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Plantilla } from "@/lib/types";
import { cambiarAprobacion, crearPlantilla, eliminarPlantilla } from "./actions";

export default async function Plantillas() {
  const { local } = await requerirAdmin();
  const { data } = await supabaseAdmin().from("plantillas").select("*").eq("local_id", local.id).order("nombre");
  const plantillas = (data ?? []) as Plantilla[];
  const proveedor = process.env.WHATSAPP_PROVIDER ?? "mock";

  return (
    <>
      <Titulo>Plantillas de WhatsApp</Titulo>
      <div className="mb-6 max-w-3xl space-y-3 text-sm text-neutral-600">
        <p>
          WhatsApp solo permite iniciar conversaciones con plantillas aprobadas por Meta. Acá se registra un espejo de
          cada plantilla: el nombre exacto, el idioma y el texto con <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>...
          para la vista previa. Las variables <code>nombre</code> y <code>local</code> se completan solas.
        </p>
        {proveedor === "mock" ? (
          <Alerta tipo="info">
            Proveedor actual: <strong>mock</strong>. Los envíos se simulan y se registran en consola. Para enviar de
            verdad configurá <code>WHATSAPP_PROVIDER=meta</code> y las credenciales.
          </Alerta>
        ) : (
          <Alerta tipo="ok">Proveedor actual: WhatsApp Cloud API (Meta).</Alerta>
        )}
      </div>

      <Tarjeta className="mb-6">
        <form action={crearPlantilla} className="grid gap-3 md:grid-cols-2">
          <Campo etiqueta="Nombre interno">
            <Entrada name="nombre" required placeholder="Promo de hoy" />
          </Campo>
          <Campo etiqueta="Nombre en Meta" ayuda="Minúsculas y guiones bajos, exactamente como en Meta Business.">
            <Entrada name="nombre_meta" required placeholder="promo_hoy" pattern="[a-z0-9_]+" />
          </Campo>
          <Campo etiqueta="Idioma">
            <Entrada name="idioma" defaultValue="es" />
          </Campo>
          <Campo etiqueta="Categoría">
            <Seleccion name="categoria" defaultValue="marketing">
              <option value="marketing">marketing</option>
              <option value="utility">utility</option>
            </Seleccion>
          </Campo>
          <div className="md:col-span-2">
            <Campo etiqueta="Cuerpo" ayuda="Debe coincidir con el aprobado en Meta. Incluí la forma de darse de baja.">
              <AreaTexto name="cuerpo" rows={3} required placeholder="{{1}}: {{2}}. Solo hoy, hasta las {{3}}. Respondé BAJA para no recibir más mensajes." />
            </Campo>
          </div>
          <Campo etiqueta="Variables en orden" ayuda="Separadas por coma, una por cada {{n}}.">
            <Entrada name="variables" placeholder="local, promo, hora_limite" />
          </Campo>
          <Campo etiqueta="Estado en Meta">
            <Seleccion name="estado_aprobacion" defaultValue="pendiente">
              <option value="pendiente">pendiente</option>
              <option value="aprobada">aprobada</option>
              <option value="rechazada">rechazada</option>
            </Seleccion>
          </Campo>
          <div className="md:col-span-2">
            <Boton type="submit">Guardar plantilla</Boton>
          </div>
        </form>
      </Tarjeta>

      <Tabla>
        <thead>
          <tr>
            <Th>Plantilla</Th>
            <Th>Cuerpo</Th>
            <Th>Variables</Th>
            <Th>Estado</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {plantillas.map((p) => (
            <tr key={p.id}>
              <Td>
                <div className="font-medium">{p.nombre}</div>
                <div className="font-mono text-xs text-neutral-500">
                  {p.nombre_meta} · {p.idioma} · {p.categoria}
                </div>
              </Td>
              <Td className="max-w-md text-xs text-neutral-700">{p.cuerpo}</Td>
              <Td className="font-mono text-xs">{p.variables.join(", ")}</Td>
              <Td>
                <form action={cambiarAprobacion} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Seleccion name="estado_aprobacion" defaultValue={p.estado_aprobacion} className="w-auto">
                    <option value="pendiente">pendiente</option>
                    <option value="aprobada">aprobada</option>
                    <option value="rechazada">rechazada</option>
                  </Seleccion>
                  <Boton type="submit" variante="sutil">
                    OK
                  </Boton>
                </form>
              </Td>
              <Td>
                <form action={eliminarPlantilla}>
                  <input type="hidden" name="id" value={p.id} />
                  <Boton type="submit" variante="sutil" className="text-red-700">
                    Eliminar
                  </Boton>
                </form>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
      {plantillas.some((p) => p.estado_aprobacion !== "aprobada") && (
        <p className="mt-3 text-xs text-neutral-500">
          <Insignia tono="amarillo">nota</Insignia> Solo las plantillas aprobadas pueden usarse en campañas.
        </p>
      )}
    </>
  );
}
