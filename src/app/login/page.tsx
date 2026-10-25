import { Alerta, Boton, Campo, Entrada, Tarjeta } from "@/components/ui";
import { iniciarSesion } from "./actions";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; volver?: string }>;
}) {
  const { error, volver } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-center text-2xl font-semibold">Ingresar al panel</h1>
      <Tarjeta>
        <form action={iniciarSesion} className="space-y-4">
          <input type="hidden" name="volver" value={volver ?? ""} />
          {error && <Alerta tipo="error">{error}</Alerta>}
          <Campo etiqueta="Email">
            <Entrada type="email" name="email" autoComplete="email" required />
          </Campo>
          <Campo etiqueta="Contraseña">
            <Entrada type="password" name="password" autoComplete="current-password" required />
          </Campo>
          <Boton type="submit" className="w-full">
            Entrar
          </Boton>
        </form>
      </Tarjeta>
      <p className="mt-4 text-center text-xs text-neutral-500">
        Los usuarios se crean con <code>npm run crear-usuario</code>.
      </p>
    </main>
  );
}
