-- =====================================================================
-- Club de clientes por QR para restaurantes - Esquema inicial (Fase 1)
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Locales (tenant)
-- ---------------------------------------------------------------------
create table if not exists locales (
  id                        uuid primary key default gen_random_uuid(),
  nombre                    text not null,
  slug                      text not null unique,
  pais                      text not null default 'CO',          -- ISO 3166-1 alfa-2, para normalizar teléfonos
  zona_horaria              text not null default 'America/Bogota',
  moneda                    text not null default 'COP',
  telefono_whatsapp         text,                                 -- número visible del local
  whatsapp_phone_number_id  text,                                 -- ID del número en WhatsApp Cloud API
  costo_mensaje_usd         numeric(8,4) not null default 0.0600, -- costo estimado por mensaje de marketing
  incentivo_registro        text not null default 'Sumate al club y llevate un postre de regalo',
  plan                      text not null default 'piloto',
  creado_en                 timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Usuarios del panel (vinculados a auth.users)
-- ---------------------------------------------------------------------
create table if not exists usuarios (
  id         uuid primary key references auth.users(id) on delete cascade,
  local_id   uuid not null references locales(id) on delete cascade,
  email      text not null,
  nombre     text,
  rol        text not null check (rol in ('admin', 'encargado', 'mesero')),
  creado_en  timestamptz not null default now()
);
create index if not exists usuarios_local_idx on usuarios(local_id);

-- ---------------------------------------------------------------------
-- Mesas y QR
-- ---------------------------------------------------------------------
create table if not exists mesas (
  id        uuid primary key default gen_random_uuid(),
  local_id  uuid not null references locales(id) on delete cascade,
  numero    integer not null,
  nombre    text,
  -- base64 apto para URL (sin "/" ni "+")
  token_qr  text not null unique default translate(encode(gen_random_bytes(9), 'base64'), '/+', '_-'),
  activa    boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (local_id, numero)
);

-- ---------------------------------------------------------------------
-- Carta digital (mínima)
-- ---------------------------------------------------------------------
create table if not exists productos (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references locales(id) on delete cascade,
  categoria   text not null,
  nombre      text not null,
  descripcion text,
  precio      numeric(12,2),
  orden       integer not null default 0,
  disponible  boolean not null default true
);
create index if not exists productos_local_idx on productos(local_id, categoria, orden);

-- ---------------------------------------------------------------------
-- Clientes (el "club")
-- ---------------------------------------------------------------------
create table if not exists clientes (
  id                       uuid primary key default gen_random_uuid(),
  local_id                 uuid not null references locales(id) on delete cascade,
  telefono                 text not null,                 -- E.164, ej. +573001234567
  nombre                   text not null,
  fecha_nacimiento         date,
  consentimiento_marketing boolean not null default false,
  consentimiento_fecha     timestamptz,
  consentimiento_texto     text,
  opt_out_fecha            timestamptz,
  origen                   text not null default 'qr',    -- qr | manual | importacion
  mesa_registro_id         uuid references mesas(id) on delete set null,
  creado_en                timestamptz not null default now(),
  unique (local_id, telefono)
);
create index if not exists clientes_local_idx on clientes(local_id, creado_en desc);

-- ---------------------------------------------------------------------
-- Visitas (opción A: cada escaneo registra una visita)
-- ---------------------------------------------------------------------
create table if not exists visitas (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references locales(id) on delete cascade,
  cliente_id  uuid not null references clientes(id) on delete cascade,
  mesa_id     uuid references mesas(id) on delete set null,
  inicio      timestamptz not null default now(),
  fin         timestamptz,
  total       numeric(12,2),                             -- se completa en fase 2 (ticket)
  origen      text not null default 'qr',                -- qr | manual | pos
  campana_id  uuid                                       -- atribución: visita dentro de 48 h de un envío
);
create index if not exists visitas_cliente_idx on visitas(cliente_id, inicio desc);
create index if not exists visitas_local_idx on visitas(local_id, inicio desc);

-- ---------------------------------------------------------------------
-- Cupones (bienvenida y campañas)
-- ---------------------------------------------------------------------
create table if not exists cupones (
  id           uuid primary key default gen_random_uuid(),
  local_id     uuid not null references locales(id) on delete cascade,
  cliente_id   uuid not null references clientes(id) on delete cascade,
  tipo         text not null default 'bienvenida',        -- bienvenida | campana
  descripcion  text not null,
  codigo       text not null,
  estado       text not null default 'activo' check (estado in ('activo', 'canjeado', 'vencido', 'anulado')),
  vence_en     timestamptz,
  canjeado_en  timestamptz,
  canjeado_por uuid references usuarios(id) on delete set null,
  creado_en    timestamptz not null default now(),
  unique (local_id, codigo)
);
create index if not exists cupones_cliente_idx on cupones(cliente_id);

-- ---------------------------------------------------------------------
-- Plantillas de WhatsApp (espejo de las plantillas aprobadas en Meta)
-- ---------------------------------------------------------------------
create table if not exists plantillas (
  id                 uuid primary key default gen_random_uuid(),
  local_id           uuid not null references locales(id) on delete cascade,
  nombre             text not null,                        -- nombre interno
  nombre_meta        text not null,                        -- nombre exacto en Meta Business
  idioma             text not null default 'es',           -- código de idioma en Meta (es, es_AR, es_MX...)
  categoria          text not null default 'marketing',    -- marketing | utility
  cuerpo             text not null,                        -- texto con {{1}}, {{2}}... para la vista previa
  variables          jsonb not null default '[]'::jsonb,   -- ["promo", "hora_limite"]
  estado_aprobacion  text not null default 'pendiente',    -- pendiente | aprobada | rechazada
  creado_en          timestamptz not null default now(),
  unique (local_id, nombre_meta, idioma)
);

-- ---------------------------------------------------------------------
-- Campañas y envíos
-- ---------------------------------------------------------------------
create table if not exists campanas (
  id              uuid primary key default gen_random_uuid(),
  local_id        uuid not null references locales(id) on delete cascade,
  plantilla_id    uuid not null references plantillas(id),
  nombre          text not null,
  segmento        jsonb not null default '{"tipo":"todos"}'::jsonb,
  valores         jsonb not null default '{}'::jsonb,       -- {"promo": "2x1 en café", "hora_limite": "20:00"}
  programada_para timestamptz,
  estado          text not null default 'borrador' check (estado in ('borrador', 'lista', 'enviando', 'enviada', 'cancelada')),
  destinatarios   integer not null default 0,
  costo_estimado  numeric(10,4) not null default 0,
  creada_por      uuid references usuarios(id) on delete set null,
  creado_en       timestamptz not null default now(),
  enviada_en      timestamptz
);
create index if not exists campanas_local_idx on campanas(local_id, creado_en desc);

create table if not exists envios (
  id          uuid primary key default gen_random_uuid(),
  local_id    uuid not null references locales(id) on delete cascade,
  campana_id  uuid references campanas(id) on delete cascade,   -- null para mensajes de bienvenida
  cliente_id  uuid not null references clientes(id) on delete cascade,
  tipo        text not null default 'campana',                   -- campana | bienvenida
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'enviado', 'entregado', 'leido', 'fallido', 'omitido')),
  wamid       text,                                              -- id del mensaje en WhatsApp
  error       text,
  enviado_en  timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists envios_campana_idx on envios(campana_id, estado);
create index if not exists envios_cliente_idx on envios(cliente_id, enviado_en desc);
create unique index if not exists envios_wamid_idx on envios(wamid) where wamid is not null;

-- ---------------------------------------------------------------------
-- Eventos crudos del webhook de WhatsApp (auditoría)
-- ---------------------------------------------------------------------
create table if not exists eventos_webhook (
  id          bigserial primary key,
  local_id    uuid references locales(id) on delete set null,
  payload     jsonb not null,
  recibido_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS: el panel opera con la clave de servicio desde el servidor, pero
-- se habilita RLS como defensa en profundidad para cualquier acceso
-- directo con la clave anónima/autenticada.
-- ---------------------------------------------------------------------
create or replace function mi_local_id() returns uuid
language sql stable security definer as $$
  select local_id from usuarios where id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['locales','usuarios','mesas','productos','clientes','visitas','cupones','plantillas','campanas','envios','eventos_webhook']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

create policy "local propio" on locales for select using (id = mi_local_id());
create policy "usuarios del local" on usuarios for select using (local_id = mi_local_id());

create policy "mesas del local" on mesas for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "productos del local" on productos for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "clientes del local" on clientes for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "visitas del local" on visitas for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "cupones del local" on cupones for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "plantillas del local" on plantillas for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "campanas del local" on campanas for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "envios del local" on envios for all using (local_id = mi_local_id()) with check (local_id = mi_local_id());
create policy "eventos del local" on eventos_webhook for select using (local_id = mi_local_id());
