import { Boton, Campo, EnlaceBoton, Entrada, Insignia, Tabla, Tarjeta, Td, Th, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Mesa } from "@/lib/types";
import { alternarMesa, crearMesas, regenerarToken, renombrarMesa } from "./actions";

export default async function Mesas() {
  const { local } = await requerirAdmin();
  const { data } = await supabaseAdmin().from("mesas").select("*").eq("local_id", local.id).order("numero");
  const mesas = (data ?? []) as Mesa[];
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <Titulo acciones={<EnlaceBoton href="/admin/mesas/imprimir" variante="secundario">Imprimir QR</EnlaceBoton>}>
        Mesas y QR
      </Titulo>

      <Tarjeta className="mb-6 max-w-md">
        <form action={crearMesas} className="flex items-end gap-3">
          <Campo etiqueta="Agregar mesas" ayuda="Se numeran a continuación de la última.">
            <Entrada type="number" name="cantidad" min={1} max={100} defaultValue={1} />
          </Campo>
          <Boton type="submit">Agregar</Boton>
        </form>
      </Tarjeta>

      <Tabla>
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Nombre</Th>
            <Th>Enlace del QR</Th>
            <Th>Estado</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {mesas.map((m) => (
            <tr key={m.id}>
              <Td className="font-medium tabular-nums">{m.numero}</Td>
              <Td>
                <form action={renombrarMesa} className="flex gap-2">
                  <input type="hidden" name="id" value={m.id} />
                  <Entrada name="nombre" defaultValue={m.nombre ?? ""} placeholder="Ej: Terraza 1" className="max-w-40" />
                  <Boton type="submit" variante="sutil">
                    Guardar
                  </Boton>
                </form>
              </Td>
              <Td>
                <a href={`${base}/m/${m.token_qr}`} target="_blank" className="font-mono text-xs underline" rel="noreferrer">
                  /m/{m.token_qr}
                </a>
              </Td>
              <Td>{m.activa ? <Insignia tono="verde">activa</Insignia> : <Insignia tono="gris">inactiva</Insignia>}</Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <form action={alternarMesa}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="activa" value={String(m.activa)} />
                    <Boton type="submit" variante="sutil">
                      {m.activa ? "Desactivar" : "Activar"}
                    </Boton>
                  </form>
                  <form action={regenerarToken}>
                    <input type="hidden" name="id" value={m.id} />
                    <Boton type="submit" variante="sutil" title="Invalida el QR impreso actual">
                      Nuevo QR
                    </Boton>
                  </form>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </>
  );
}
