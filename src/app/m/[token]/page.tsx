import { notFound } from "next/navigation";
import { Alerta, Boton, Campo, Entrada } from "@/components/ui";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatearDinero } from "@/lib/formato";
import type { Local, Mesa, Producto } from "@/lib/types";
import { TEXTO_CONSENTIMIENTO } from "@/lib/consentimiento";
import { registrarCliente } from "./actions";

export const dynamic = "force-dynamic";

export default async function PaginaMesa({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const admin = supabaseAdmin();

  const { data: mesaRaw } = await admin
    .from("mesas")
    .select("*, locales(*)")
    .eq("token_qr", token)
    .eq("activa", true)
    .maybeSingle();
  if (!mesaRaw) notFound();
  const mesa = mesaRaw as unknown as Mesa & { locales: Local };
  const local = mesa.locales;

  const { data: productosRaw } = await admin
    .from("productos")
    .select("*")
    .eq("local_id", local.id)
    .eq("disponible", true)
    .order("categoria")
    .order("orden");
  const productos = (productosRaw ?? []) as Producto[];
  const categorias = [...new Set(productos.map((p) => p.categoria))];

  const registrar = registrarCliente.bind(null, token);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{local.nombre}</h1>
        <p className="text-sm text-neutral-500">Mesa {mesa.nombre ?? mesa.numero}</p>
      </header>

      <section id="club" className="mb-8 rounded-2xl bg-neutral-900 p-5 text-white shadow-lg">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Club {local.nombre}</p>
        <h2 className="mt-1 text-xl font-semibold">{local.incentivo_registro}</h2>
        <p className="mt-1 text-sm text-neutral-300">Diez segundos, sin descargar nada.</p>

        <form action={registrar} className="mt-4 space-y-3">
          {error && <Alerta tipo="error">{error}</Alerta>}
          <Campo etiqueta="Tu nombre">
            <Entrada name="nombre" autoComplete="given-name" required minLength={2} maxLength={80} className="text-neutral-900" />
          </Campo>
          <Campo etiqueta="Tu WhatsApp" ayuda="Te mandamos el regalo por WhatsApp.">
            <Entrada name="telefono" type="tel" inputMode="tel" autoComplete="tel" required className="text-neutral-900" placeholder="Ej: 300 123 4567" />
          </Campo>
          <Campo etiqueta="Cumpleaños (opcional)" ayuda="Para saludarte con algo especial.">
            <Entrada name="cumpleanos" type="date" className="text-neutral-900" />
          </Campo>
          <label className="flex items-start gap-2 text-xs text-neutral-300">
            <input type="checkbox" name="consentimiento" required className="mt-0.5" />
            <span>{TEXTO_CONSENTIMIENTO}</span>
          </label>
          <Boton type="submit" className="w-full bg-white text-neutral-900 hover:bg-neutral-200">
            Sumarme al club
          </Boton>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Carta</h2>
        {categorias.length === 0 && <p className="text-sm text-neutral-500">La carta se está cargando.</p>}
        {categorias.map((cat) => (
          <div key={cat} className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{cat}</h3>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {productos
                .filter((p) => p.categoria === cat)
                .map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="font-medium">{p.nombre}</div>
                      {p.descripcion && <div className="text-xs text-neutral-500">{p.descripcion}</div>}
                    </div>
                    <div className="shrink-0 text-sm tabular-nums">{formatearDinero(p.precio, local.moneda)}</div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
