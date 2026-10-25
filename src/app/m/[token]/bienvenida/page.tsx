import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Local, Mesa } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Bienvenida({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ c?: string; ya?: string }>;
}) {
  const { token } = await params;
  const { c: codigo, ya } = await searchParams;

  const { data: mesaRaw } = await supabaseAdmin()
    .from("mesas")
    .select("numero, nombre, locales(nombre, incentivo_registro)")
    .eq("token_qr", token)
    .maybeSingle();
  if (!mesaRaw) notFound();
  const mesa = mesaRaw as unknown as Pick<Mesa, "numero" | "nombre"> & { locales: Pick<Local, "nombre" | "incentivo_registro"> };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 text-center">
      {codigo ? (
        <>
          <p className="text-sm uppercase tracking-wide text-neutral-500">¡Ya sos parte del club!</p>
          <h1 className="mt-2 text-2xl font-semibold">{mesa.locales.incentivo_registro}</h1>
          <p className="mt-4 text-sm text-neutral-600">Mostrá este código al mesero:</p>
          <div className="mx-auto mt-3 rounded-2xl bg-neutral-900 px-8 py-6 font-mono text-4xl font-bold tracking-[0.3em] text-white">
            {codigo}
          </div>
          <p className="mt-4 text-xs text-neutral-500">
            También te lo enviamos por WhatsApp. Vale por 30 días.
          </p>
        </>
      ) : ya ? (
        <>
          <h1 className="text-2xl font-semibold">¡Qué bueno verte de nuevo!</h1>
          <p className="mt-3 text-neutral-600">
            Ya sos parte del club de {mesa.locales.nombre}. Registramos tu visita de hoy.
          </p>
        </>
      ) : (
        <h1 className="text-2xl font-semibold">Gracias</h1>
      )}
      <Link href={`/m/${encodeURIComponent(token)}`} className="mt-8 text-sm text-neutral-500 underline">
        Volver a la carta
      </Link>
    </main>
  );
}
