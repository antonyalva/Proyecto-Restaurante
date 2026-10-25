import "server-only";
import { proveedorMeta } from "./meta";
import { proveedorMock } from "./mock";
import type { ProveedorWhatsapp } from "./types";

export type { EnvioPlantilla, ProveedorWhatsapp, ResultadoEnvio } from "./types";

export function proveedorWhatsapp(): ProveedorWhatsapp {
  return process.env.WHATSAPP_PROVIDER === "meta" ? proveedorMeta : proveedorMock;
}

/** Mapea los estados del webhook de Meta a los estados internos. */
export function mapearEstadoMeta(estado: string): "enviado" | "entregado" | "leido" | "fallido" | null {
  switch (estado) {
    case "sent":
      return "enviado";
    case "delivered":
      return "entregado";
    case "read":
      return "leido";
    case "failed":
      return "fallido";
    default:
      return null;
  }
}
