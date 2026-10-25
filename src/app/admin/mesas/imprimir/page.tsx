import QRCode from "qrcode";
import { EnlaceBoton } from "@/components/ui";
import { requerirAdmin } from "@/lib/auth";
import { urlBase } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Mesa } from "@/lib/types";

export default async function ImprimirQr() {
  const { local } = await requerirAdmin();
  const { data } = await supabaseAdmin().from("mesas").select("*").eq("local_id", local.id).eq("activa", true).order("numero");
  const mesas = (data ?? []) as Mesa[];
  const base = urlBase();

  const tarjetas = await Promise.all(
    mesas.map(async (m) => ({
      mesa: m,
      png: await QRCode.toDataURL(`${base}/m/${m.token_qr}`, { width: 360, margin: 1, errorCorrectionLevel: "M" }),
    })),
  );

  return (
    <>
      <div className="no-print mb-6 flex items-center gap-3">
        <EnlaceBoton href="/admin/mesas" variante="secundario">
          Volver
        </EnlaceBoton>
        <p className="text-sm text-neutral-600">
          Usá Imprimir del navegador (Ctrl+P). Cada tarjeta mide unos 9 × 12 cm.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {tarjetas.map(({ mesa, png }) => (
          <div
            key={mesa.id}
            className="flex break-inside-avoid flex-col items-center rounded-2xl border-2 border-neutral-900 bg-white p-4 text-center"
          >
            <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{local.nombre}</div>
            <div className="text-lg font-semibold">Mesa {mesa.nombre ?? mesa.numero}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={png} alt={`QR mesa ${mesa.numero}`} className="my-2 w-full max-w-[220px]" />
            <div className="text-sm font-semibold">Escaneá para ver la carta</div>
            <div className="mt-1 text-xs text-neutral-600">{local.incentivo_registro}</div>
          </div>
        ))}
      </div>
    </>
  );
}
