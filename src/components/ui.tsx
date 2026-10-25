import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
const variantes = {
  primario: "bg-neutral-900 text-white hover:bg-neutral-700",
  secundario: "bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100",
  peligro: "bg-red-600 text-white hover:bg-red-500",
  sutil: "text-neutral-700 hover:bg-neutral-100",
} as const;

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof variantes }) {
  return <button className={`${base} ${variantes[variante]} ${className}`} {...props} />;
}

export function EnlaceBoton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: keyof typeof variantes }) {
  return <Link className={`${base} ${variantes[variante]} ${className}`} {...props} />;
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-neutral-800">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-xs text-neutral-500">{ayuda}</span>}
    </label>
  );
}

const estiloEntrada =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

export function Entrada({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${estiloEntrada} ${className}`} {...props} />;
}

export function Seleccion({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${estiloEntrada} ${className}`} {...props} />;
}

export function AreaTexto({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${estiloEntrada} ${className}`} {...props} />;
}

const tonos = {
  gris: "bg-neutral-100 text-neutral-700",
  verde: "bg-emerald-100 text-emerald-800",
  amarillo: "bg-amber-100 text-amber-800",
  rojo: "bg-red-100 text-red-800",
  azul: "bg-sky-100 text-sky-800",
} as const;

export function Insignia({ tono = "gris", children }: { tono?: keyof typeof tonos; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tonos[tono]}`}>{children}</span>;
}

export function Alerta({ tipo = "info", children }: { tipo?: "info" | "error" | "ok"; children: ReactNode }) {
  const estilos = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    error: "border-red-200 bg-red-50 text-red-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${estilos[tipo]}`}>{children}</div>;
}

export function Titulo({ children, acciones }: { children: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {acciones && <div className="flex gap-2">{acciones}</div>}
    </div>
  );
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ className = "", ...props }: ComponentProps<"td">) {
  return <td className={`border-b border-neutral-100 px-4 py-2 align-middle ${className}`} {...props} />;
}

export function Kpi({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: string }) {
  return (
    <Tarjeta>
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{etiqueta}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-neutral-500">{detalle}</div>}
    </Tarjeta>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{children}</div>;
}
