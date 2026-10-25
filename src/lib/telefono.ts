import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

/**
 * Normaliza un teléfono a E.164 (+573001234567) usando el país del local
 * como valor por defecto cuando el usuario no escribe el prefijo.
 * Devuelve null si el número no es válido.
 */
export function normalizarTelefono(entrada: string, pais: string): string | null {
  const limpio = entrada.trim();
  if (!limpio) return null;
  const numero = parsePhoneNumberFromString(limpio, pais.toUpperCase() as CountryCode);
  if (!numero || !numero.isValid()) return null;
  return numero.number; // E.164
}

/** Formato legible para el panel. */
export function formatearTelefono(e164: string): string {
  const numero = parsePhoneNumberFromString(e164);
  return numero ? numero.formatInternational() : e164;
}

/** WhatsApp Cloud API espera el número sin el signo "+". */
export function telefonoParaWhatsapp(e164: string): string {
  return e164.replace(/^\+/, "");
}
