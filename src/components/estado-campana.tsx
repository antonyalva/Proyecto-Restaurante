import { Insignia } from "@/components/ui";
import type { Campana } from "@/lib/types";

export function EstadoCampana({ estado }: { estado: Campana["estado"] }) {
  const tono = { borrador: "gris", lista: "azul", enviando: "amarillo", enviada: "verde", cancelada: "rojo" } as const;
  return <Insignia tono={tono[estado]}>{estado}</Insignia>;
}
