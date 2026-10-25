import { EnlaceBoton } from "@/components/ui";

export default function SinPermiso() {
  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Sin permiso</h1>
      <p className="text-neutral-600">Tu usuario no tiene acceso a esta sección.</p>
      <EnlaceBoton href="/mesero" variante="secundario">
        Ir a la vista mesero
      </EnlaceBoton>
    </main>
  );
}
