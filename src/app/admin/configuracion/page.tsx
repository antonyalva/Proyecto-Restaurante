import { Alerta, Boton, Campo, Entrada, Tarjeta, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { guardarConfiguracion } from "./actions";

export default async function Configuracion() {
  const { local, usuario } = await requerirAdmin();
  const soloLectura = usuario.rol !== "admin";

  return (
    <>
      <Titulo>Configuración del local</Titulo>
      {soloLectura && (
        <div className="mb-4">
          <Alerta tipo="info">Solo un usuario con rol admin puede modificar la configuración.</Alerta>
        </div>
      )}
      <Tarjeta className="max-w-2xl">
        <form action={guardarConfiguracion} className="grid gap-4 md:grid-cols-2">
          <fieldset disabled={soloLectura} className="contents">
            <Campo etiqueta="Nombre del local">
              <Entrada name="nombre" defaultValue={local.nombre} required />
            </Campo>
            <Campo etiqueta="País (ISO 2 letras)" ayuda="Define el prefijo telefónico por defecto.">
              <Entrada name="pais" defaultValue={local.pais} maxLength={2} required />
            </Campo>
            <Campo etiqueta="Zona horaria">
              <Entrada name="zona_horaria" defaultValue={local.zona_horaria} required />
            </Campo>
            <Campo etiqueta="Moneda (ISO)">
              <Entrada name="moneda" defaultValue={local.moneda} maxLength={3} required />
            </Campo>
            <div className="md:col-span-2">
              <Campo etiqueta="Incentivo de registro" ayuda="Aparece en el QR, en la carta y en el cupón.">
                <Entrada name="incentivo_registro" defaultValue={local.incentivo_registro} required />
              </Campo>
            </div>
            <Campo etiqueta="Teléfono de WhatsApp del local">
              <Entrada name="telefono_whatsapp" defaultValue={local.telefono_whatsapp ?? ""} />
            </Campo>
            <Campo etiqueta="Phone Number ID (WhatsApp Cloud API)" ayuda="Vacío: usa WHATSAPP_PHONE_NUMBER_ID del entorno.">
              <Entrada name="whatsapp_phone_number_id" defaultValue={local.whatsapp_phone_number_id ?? ""} />
            </Campo>
            <Campo etiqueta="Costo estimado por mensaje (USD)" ayuda="Tarifa de conversación de marketing de tu país.">
              <Entrada name="costo_mensaje_usd" type="number" step="0.0001" min={0} defaultValue={local.costo_mensaje_usd} />
            </Campo>
            <div className="flex items-end md:col-span-2">
              <Boton type="submit">Guardar</Boton>
            </div>
          </fieldset>
        </form>
      </Tarjeta>
    </>
  );
}
