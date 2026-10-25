import { Boton, Campo, Entrada, Insignia, Tabla, Tarjeta, Td, Th, Titulo } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearDinero } from "@/lib/formato";
import type { Producto } from "@/lib/types";
import { alternarDisponible, crearProducto, eliminarProducto } from "./actions";

export default async function Carta() {
  const { local } = await requerirAdmin();
  const { data } = await supabaseAdmin().from("productos").select("*").eq("local_id", local.id).order("categoria").order("orden");
  const productos = (data ?? []) as Producto[];

  return (
    <>
      <Titulo>Carta</Titulo>
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        La carta es la excusa para que el cliente escanee el QR. En esta fase es solo lectura: no hay pedidos desde el
        celular.
      </p>

      <Tarjeta className="mb-6">
        <form action={crearProducto} className="grid gap-3 md:grid-cols-6">
          <Campo etiqueta="Categoría">
            <Entrada name="categoria" required placeholder="Cafés" list="categorias" />
          </Campo>
          <datalist id="categorias">
            {[...new Set(productos.map((p) => p.categoria))].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Campo etiqueta="Nombre">
            <Entrada name="nombre" required />
          </Campo>
          <Campo etiqueta="Descripción">
            <Entrada name="descripcion" />
          </Campo>
          <Campo etiqueta={`Precio (${local.moneda})`}>
            <Entrada name="precio" type="number" step="0.01" min={0} />
          </Campo>
          <Campo etiqueta="Orden">
            <Entrada name="orden" type="number" defaultValue={0} />
          </Campo>
          <div className="flex items-end">
            <Boton type="submit" className="w-full">
              Agregar
            </Boton>
          </div>
        </form>
      </Tarjeta>

      <Tabla>
        <thead>
          <tr>
            <Th>Categoría</Th>
            <Th>Producto</Th>
            <Th className="text-right">Precio</Th>
            <Th>Estado</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <Td>{p.categoria}</Td>
              <Td>
                <div className="font-medium">{p.nombre}</div>
                {p.descripcion && <div className="text-xs text-neutral-500">{p.descripcion}</div>}
              </Td>
              <Td className="text-right tabular-nums">{formatearDinero(p.precio, local.moneda)}</Td>
              <Td>{p.disponible ? <Insignia tono="verde">disponible</Insignia> : <Insignia tono="gris">oculto</Insignia>}</Td>
              <Td>
                <div className="flex justify-end gap-2">
                  <form action={alternarDisponible}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="disponible" value={String(p.disponible)} />
                    <Boton type="submit" variante="sutil">
                      {p.disponible ? "Ocultar" : "Mostrar"}
                    </Boton>
                  </form>
                  <form action={eliminarProducto}>
                    <input type="hidden" name="id" value={p.id} />
                    <Boton type="submit" variante="sutil" className="text-red-700">
                      Eliminar
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
