export function formatearFecha(
  valor: string | Date | null | undefined,
  zona = "America/Bogota",
  opciones: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  if (!valor) return "—";
  const fecha = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es", { ...opciones, timeZone: zona }).format(fecha);
}

export function formatearDia(valor: string | Date | null | undefined, zona = "America/Bogota"): string {
  return formatearFecha(valor, zona, { dateStyle: "medium" });
}

const LOCALE_POR_MONEDA: Record<string, string> = {
  COP: "es-CO",
  ARS: "es-AR",
  MXN: "es-MX",
  CLP: "es-CL",
  PEN: "es-PE",
  UYU: "es-UY",
  EUR: "es-ES",
  USD: "en-US",
};

export function formatearDinero(valor: number | null | undefined, moneda = "COP"): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat(LOCALE_POR_MONEDA[moneda] ?? "es", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatearUsd(valor: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(valor);
}

/** ISO del instante "hace N milisegundos". */
export function isoHace(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

export function esFuturo(valor: string | null | undefined): boolean {
  return Boolean(valor) && new Date(valor as string).getTime() > Date.now();
}

export function diasDesde(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const ms = Date.now() - new Date(valor).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Código de cupón corto sin caracteres ambiguos (0/O, 1/I/L). */
export function generarCodigoCupon(longitud = 6): string {
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let codigo = "";
  const bytes = new Uint8Array(longitud);
  crypto.getRandomValues(bytes);
  for (const b of bytes) codigo += alfabeto[b % alfabeto.length];
  return codigo;
}

/** Reemplaza {{1}}, {{2}}... por los valores en orden de `variables`. */
export function renderizarPlantilla(cuerpo: string, variables: string[], valores: Record<string, string>): string {
  return variables.reduce(
    (texto, nombre, i) => texto.replaceAll(`{{${i + 1}}}`, valores[nombre] ?? `{${nombre}}`),
    cuerpo,
  );
}
