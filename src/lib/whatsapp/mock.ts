import type { EnvioPlantilla, ProveedorWhatsapp, ResultadoEnvio } from "./types";

/**
 * Proveedor de desarrollo: no envía nada, escribe en consola y devuelve
 * un id falso. Permite probar todo el flujo sin cuenta de Meta.
 */
export const proveedorMock: ProveedorWhatsapp = {
  nombre: "mock",
  async enviarPlantilla(envio: EnvioPlantilla): Promise<ResultadoEnvio> {
    const wamid = `mock.${crypto.randomUUID()}`;
    console.info(
      `[whatsapp:mock] → ${envio.para} plantilla=${envio.plantilla} (${envio.idioma}) params=${JSON.stringify(envio.parametros)} wamid=${wamid}`,
    );
    return { ok: true, wamid };
  },
};
