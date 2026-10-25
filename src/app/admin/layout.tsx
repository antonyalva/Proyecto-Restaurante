import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { cerrarSesion } from "@/app/login/actions";

export const dynamic = "force-dynamic";

const enlaces = [
  { href: "/admin", etiqueta: "Resumen" },
  { href: "/admin/clientes", etiqueta: "Clientes" },
  { href: "/admin/campanas", etiqueta: "Campañas" },
  { href: "/admin/plantillas", etiqueta: "Plantillas" },
  { href: "/admin/mesas", etiqueta: "Mesas y QR" },
  { href: "/admin/carta", etiqueta: "Carta" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
  { href: "/mesero", etiqueta: "Vista mesero" },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { usuario, local } = await requerirAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="no-print w-full border-b border-neutral-200 bg-white md:w-60 md:border-b-0 md:border-r">
        <div className="px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Club de clientes</div>
          <div className="font-semibold">{local.nombre}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {e.etiqueta}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-neutral-200 px-5 py-4 text-xs text-neutral-500 md:mt-6">
          <div className="truncate">{usuario.email}</div>
          <div className="capitalize">{usuario.rol}</div>
          <form action={cerrarSesion} className="mt-2">
            <button className="underline hover:text-neutral-900">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
    </div>
  );
}
