import Link from "next/link";
import { Alerta, Boton, Entrada, Tabla, Tarjeta, Td, Th } from "@/components/ui";
import { requerirStaff } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearFecha, isoHace } from "@/lib/formato";
import { cerrarSesion } from "@/app/login/actions";
import type { Cupon } from "@/lib/types";
import { canjearCupon } from "./actions";

export const dynamic = "force-dynamic";

export default async function Mesero({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { local, usuario } = await requerirStaff();
  const { ok, error } = await searchParams;

  const hace24h = isoHace(24 * 3_600_000);
  const { data } = await supabaseAdmin()
    .from("cupones")
    .select("*, clientes(nombre)")
    .eq("local_id", local.id)
    .eq("estado", "canjeado")
    .gte("canjeado_en", hace24h)
    .order("canjeado_en", { ascending: false })
    .limit(20);
  const recientes = (data ?? []) as (Cupon & { clientes: { nombre: string } })[];

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">{local.nombre}</div>
          <h1 className="text-2xl font-semibold">Canjear cupón</h1>
        </div>
        <div className="text-right text-xs text-neutral-500">
          {usuario.rol !== "mesero" && (
            <Link href="/admin" className="block underline">
              Panel
            </Link>
          )}
          <form action={cerrarSesion}>
            <button className="underline">Salir</button>
          </form>
        </div>
      </header>

      <Tarjeta>
        <form action={canjearCupon} className="space-y-3">
          {ok && <Alerta tipo="ok">Canjeado · {ok}</Alerta>}
          {error && <Alerta tipo="error">{error}</Alerta>}
          <Entrada
            name="codigo"
            placeholder="Código del cliente"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            className="text-center font-mono text-2xl tracking-[0.3em] uppercase"
            maxLength={8}
          />
          <Boton type="submit" className="w-full py-3 text-base">
            Canjear
          </Boton>
          <p className="text-center text-xs text-neutral-500">
            El cliente ve el código en su pantalla al sumarse al club y lo recibe por WhatsApp.
          </p>
        </form>
      </Tarjeta>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">Canjeados en las últimas 24 h</h2>
      <Tabla>
        <thead>
          <tr>
            <Th>Hora</Th>
            <Th>Cliente</Th>
            <Th>Regalo</Th>
          </tr>
        </thead>
        <tbody>
          {recientes.length === 0 && (
            <tr>
              <Td className="text-center text-neutral-500" colSpan={3}>
                Todavía nada.
              </Td>
            </tr>
          )}
          {recientes.map((c) => (
            <tr key={c.id}>
              <Td>{formatearFecha(c.canjeado_en, local.zona_horaria, { timeStyle: "short" })}</Td>
              <Td>{c.clientes?.nombre}</Td>
              <Td className="text-xs">{c.descripcion}</Td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </main>
  );
}
