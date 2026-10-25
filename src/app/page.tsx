import { EnlaceBoton } from "@/components/ui";

export default function Portada() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
        Fase 1 · MVP
      </span>
      <h1 className="text-4xl font-semibold tracking-tight">Club de clientes por QR</h1>
      <p className="max-w-lg text-neutral-600">
        El cliente escanea el QR de la mesa, se suma al club con nombre y teléfono, y cuando el salón
        está flojo le mandás un mensaje a toda tu base.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <EnlaceBoton href="/admin">Entrar al panel</EnlaceBoton>
        <EnlaceBoton href="/mesero" variante="secundario">
          Vista mesero
        </EnlaceBoton>
      </div>
      <p className="text-xs text-neutral-400">
        Los clientes nunca ven esta página: llegan por el QR a la carta del local.
      </p>
    </main>
  );
}
