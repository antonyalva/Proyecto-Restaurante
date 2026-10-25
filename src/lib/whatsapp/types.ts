export type EnvioPlantilla = {
  /** Teléfono en E.164 */
  para: string;
  /** Nombre exacto de la plantilla aprobada en Meta */
  plantilla: string;
  idioma: string;
  /** Valores de {{1}}, {{2}}... en orden */
  parametros: string[];
  /** ID del número emisor en WhatsApp Cloud API (opcional, usa el del entorno) */
  phoneNumberId?: string | null;
};

export type ResultadoEnvio =
  | { ok: true; wamid: string }
  | { ok: false; error: string };

export interface ProveedorWhatsapp {
  nombre: string;
  enviarPlantilla(envio: EnvioPlantilla): Promise<ResultadoEnvio>;
}
