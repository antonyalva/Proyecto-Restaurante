export type Rol = "admin" | "encargado" | "mesero";

export type Local = {
  id: string;
  nombre: string;
  slug: string;
  pais: string;
  zona_horaria: string;
  moneda: string;
  telefono_whatsapp: string | null;
  whatsapp_phone_number_id: string | null;
  costo_mensaje_usd: number;
  incentivo_registro: string;
  plan: string;
};

export type Usuario = {
  id: string;
  local_id: string;
  email: string;
  nombre: string | null;
  rol: Rol;
};

export type Mesa = {
  id: string;
  local_id: string;
  numero: number;
  nombre: string | null;
  token_qr: string;
  activa: boolean;
};

export type Producto = {
  id: string;
  local_id: string;
  categoria: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  orden: number;
  disponible: boolean;
};

export type Cliente = {
  id: string;
  local_id: string;
  telefono: string;
  nombre: string;
  fecha_nacimiento: string | null;
  consentimiento_marketing: boolean;
  consentimiento_fecha: string | null;
  opt_out_fecha: string | null;
  origen: string;
  creado_en: string;
};

export type Visita = {
  id: string;
  local_id: string;
  cliente_id: string;
  mesa_id: string | null;
  inicio: string;
  total: number | null;
  origen: string;
  campana_id: string | null;
};

export type Cupon = {
  id: string;
  local_id: string;
  cliente_id: string;
  tipo: string;
  descripcion: string;
  codigo: string;
  estado: "activo" | "canjeado" | "vencido" | "anulado";
  vence_en: string | null;
  canjeado_en: string | null;
  creado_en: string;
};

export type Plantilla = {
  id: string;
  local_id: string;
  nombre: string;
  nombre_meta: string;
  idioma: string;
  categoria: string;
  cuerpo: string;
  variables: string[];
  estado_aprobacion: string;
};

export type SegmentoTipo = "todos" | "inactivos" | "frecuentes" | "cumpleanos";

export type Segmento = {
  tipo: SegmentoTipo;
  dias?: number; // inactivos: días sin visitar; cumpleaños: ventana de días
};

export type Campana = {
  id: string;
  local_id: string;
  plantilla_id: string;
  nombre: string;
  segmento: Segmento;
  valores: Record<string, string>;
  programada_para: string | null;
  estado: "borrador" | "lista" | "enviando" | "enviada" | "cancelada";
  destinatarios: number;
  costo_estimado: number;
  creado_en: string;
  enviada_en: string | null;
};

export type EnvioEstado = "pendiente" | "enviado" | "entregado" | "leido" | "fallido" | "omitido";

export type Envio = {
  id: string;
  local_id: string;
  campana_id: string | null;
  cliente_id: string;
  tipo: string;
  estado: EnvioEstado;
  wamid: string | null;
  error: string | null;
  enviado_en: string | null;
};
