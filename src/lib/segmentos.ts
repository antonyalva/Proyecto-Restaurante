import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Cliente, Segmento, SegmentoTipo } from "@/lib/types";

/** Máximo de mensajes de marketing por cliente en una ventana de 7 días. */
export const MAX_CAMPANAS_POR_SEMANA = 2;

export const SEGMENTOS: { tipo: SegmentoTipo; etiqueta: string; descripcion: string; usaDias: boolean }[] = [
  { tipo: "todos", etiqueta: "Toda la base", descripcion: "Todos los clientes con consentimiento vigente", usaDias: false },
  { tipo: "inactivos", etiqueta: "Inactivos", descripcion: "No visitan hace N días", usaDias: true },
  { tipo: "frecuentes", etiqueta: "Frecuentes", descripcion: "3 o más visitas en los últimos 90 días", usaDias: false },
  { tipo: "cumpleanos", etiqueta: "Cumpleaños", descripcion: "Cumplen años en los próximos N días", usaDias: true },
];

export type ClienteSegmentado = Cliente & { ultima_visita: string | null; visitas_90d: number };

export type ResultadoSegmento = {
  destinatarios: ClienteSegmentado[];
  /** Clientes del segmento excluidos por el límite de frecuencia */
  excluidosPorFrecuencia: number;
};

/**
 * Calcula los destinatarios de un segmento. Se hace en memoria porque la
 * base de un local es de cientos o pocos miles de clientes.
 */
export async function calcularSegmento(localId: string, segmento: Segmento): Promise<ResultadoSegmento> {
  const admin = supabaseAdmin();

  const { data: clientes } = await admin
    .from("clientes")
    .select("*")
    .eq("local_id", localId)
    .eq("consentimiento_marketing", true)
    .is("opt_out_fecha", null);

  const base = (clientes ?? []) as Cliente[];
  if (base.length === 0) return { destinatarios: [], excluidosPorFrecuencia: 0 };

  const hace90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: visitas } = await admin
    .from("visitas")
    .select("cliente_id, inicio")
    .eq("local_id", localId)
    .order("inicio", { ascending: false });

  const ultima = new Map<string, string>();
  const conteo90 = new Map<string, number>();
  for (const v of (visitas ?? []) as { cliente_id: string; inicio: string }[]) {
    if (!ultima.has(v.cliente_id)) ultima.set(v.cliente_id, v.inicio);
    if (v.inicio >= hace90) conteo90.set(v.cliente_id, (conteo90.get(v.cliente_id) ?? 0) + 1);
  }

  const enriquecidos: ClienteSegmentado[] = base.map((c) => ({
    ...c,
    ultima_visita: ultima.get(c.id) ?? null,
    visitas_90d: conteo90.get(c.id) ?? 0,
  }));

  const ahora = Date.now();
  let filtrados: ClienteSegmentado[];
  switch (segmento.tipo) {
    case "inactivos": {
      const dias = segmento.dias ?? 30;
      const limite = ahora - dias * 86_400_000;
      filtrados = enriquecidos.filter((c) => {
        const ref = c.ultima_visita ?? c.creado_en;
        return new Date(ref).getTime() < limite;
      });
      break;
    }
    case "frecuentes":
      filtrados = enriquecidos.filter((c) => c.visitas_90d >= 3);
      break;
    case "cumpleanos": {
      const dias = segmento.dias ?? 7;
      filtrados = enriquecidos.filter((c) => {
        if (!c.fecha_nacimiento) return false;
        const d = diasHastaCumpleanos(c.fecha_nacimiento);
        return d >= 0 && d <= dias;
      });
      break;
    }
    default:
      filtrados = enriquecidos;
  }

  // Límite de frecuencia: proteger la calificación del número y al cliente.
  const hace7 = new Date(ahora - 7 * 86_400_000).toISOString();
  const { data: recientes } = await admin
    .from("envios")
    .select("cliente_id")
    .eq("local_id", localId)
    .eq("tipo", "campana")
    .in("estado", ["enviado", "entregado", "leido"])
    .gte("enviado_en", hace7);
  const porCliente = new Map<string, number>();
  for (const e of (recientes ?? []) as { cliente_id: string }[]) {
    porCliente.set(e.cliente_id, (porCliente.get(e.cliente_id) ?? 0) + 1);
  }
  const destinatarios = filtrados.filter((c) => (porCliente.get(c.id) ?? 0) < MAX_CAMPANAS_POR_SEMANA);

  return { destinatarios, excluidosPorFrecuencia: filtrados.length - destinatarios.length };
}

function diasHastaCumpleanos(fechaNacimiento: string): number {
  const [, mes, dia] = fechaNacimiento.split("-").map(Number);
  const hoy = new Date();
  const esteAno = new Date(hoy.getFullYear(), mes - 1, dia);
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  let diff = Math.round((esteAno.getTime() - hoySinHora.getTime()) / 86_400_000);
  if (diff < 0) {
    const proximo = new Date(hoy.getFullYear() + 1, mes - 1, dia);
    diff = Math.round((proximo.getTime() - hoySinHora.getTime()) / 86_400_000);
  }
  return diff;
}

/** Interpreta los parámetros de URL/formulario como un segmento válido. */
export function leerSegmento(params: { segmento?: string; dias?: string }): Segmento {
  const tipos: SegmentoTipo[] = ["todos", "inactivos", "frecuentes", "cumpleanos"];
  const tipo = tipos.includes(params.segmento as SegmentoTipo) ? (params.segmento as SegmentoTipo) : "todos";
  const dias = Math.min(Math.max(Number(params.dias ?? (tipo === "cumpleanos" ? 7 : 30)) || 30, 1), 365);
  return tipo === "inactivos" || tipo === "cumpleanos" ? { tipo, dias } : { tipo };
}

export function describirSegmento(segmento: Segmento): string {
  switch (segmento.tipo) {
    case "inactivos":
      return `Inactivos hace ${segmento.dias ?? 30} días`;
    case "frecuentes":
      return "Frecuentes (3+ visitas en 90 días)";
    case "cumpleanos":
      return `Cumpleaños en ${segmento.dias ?? 7} días`;
    default:
      return "Toda la base";
  }
}
