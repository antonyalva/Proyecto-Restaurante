import { telefonoParaWhatsapp } from "@/lib/telefono";
import type { EnvioPlantilla, ProveedorWhatsapp, ResultadoEnvio } from "./types";

/**
 * WhatsApp Cloud API (Meta). Envía mensajes de plantilla.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/template-messages
 */
export const proveedorMeta: ProveedorWhatsapp = {
  nombre: "meta",
  async enviarPlantilla(envio: EnvioPlantilla): Promise<ResultadoEnvio> {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = envio.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const version = process.env.WHATSAPP_API_VERSION || "v22.0";
    if (!token || !phoneNumberId) {
      return { ok: false, error: "Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID" };
    }

    const cuerpo = {
      messaging_product: "whatsapp",
      to: telefonoParaWhatsapp(envio.para),
      type: "template",
      template: {
        name: envio.plantilla,
        language: { code: envio.idioma },
        components:
          envio.parametros.length > 0
            ? [
                {
                  type: "body",
                  parameters: envio.parametros.map((texto) => ({ type: "text", text: texto })),
                },
              ]
            : [],
      },
    };

    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cuerpo),
      });
      const json = (await res.json()) as {
        messages?: { id: string }[];
        error?: { message?: string; code?: number };
      };
      if (!res.ok || !json.messages?.[0]?.id) {
        return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
      }
      return { ok: true, wamid: json.messages[0].id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Error de red" };
    }
  },
};
