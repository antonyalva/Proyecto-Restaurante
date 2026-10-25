# Club de clientes por QR · Fase 1 (MVP)

Sistema de fidelización para restaurantes, bares y cafés basado en el modelo del reel analizado en
[docs/ANALISIS_DESARROLLO.md](docs/ANALISIS_DESARROLLO.md):

1. El cliente escanea el QR de la mesa y ve la carta.
2. Se suma al club con nombre y teléfono (sin app) a cambio de un regalo.
3. Entra a la base con su historial de visitas.
4. El encargado espera el momento flojo.
5. Manda una campaña por WhatsApp a un segmento de la base.

Stack: Next.js 16 (App Router, Server Actions), Tailwind 4, Supabase (Postgres + Auth), WhatsApp Cloud API.

## Qué incluye esta fase

| Módulo | Ruta | Quién |
|---|---|---|
| Carta digital + registro al club | `/m/{token}` | Cliente (celular) |
| Cupón de bienvenida en pantalla y por WhatsApp | `/m/{token}/bienvenida` | Cliente |
| Canje de cupones | `/mesero` | Mesero / caja |
| Resumen con KPIs | `/admin` | Admin / encargado |
| Clientes, ficha, visitas, baja manual | `/admin/clientes` | Admin / encargado |
| Campañas por segmento, costo estimado, envío en lotes | `/admin/campanas` | Admin / encargado |
| Plantillas de WhatsApp (espejo de Meta) | `/admin/plantillas` | Admin / encargado |
| Mesas, QR imprimibles | `/admin/mesas` | Admin / encargado |
| Carta (productos) | `/admin/carta` | Admin / encargado |
| Configuración del local | `/admin/configuracion` | Admin |
| Webhook de WhatsApp (estados y BAJA) | `/api/whatsapp/webhook` | Meta |
| Procesador de campañas para cron | `/api/campanas/procesar` | Cron |

Segmentos disponibles: toda la base, inactivos hace N días, frecuentes (3+ visitas en 90 días),
cumpleaños en los próximos N días. Se excluye automáticamente a quien ya recibió 2 campañas en la semana.

## Puesta en marcha

### 1. Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor** ejecutar, en orden:
   - `supabase/migrations/0001_init.sql`
   - `supabase/seed.sql` (local "Café Demo" con 12 mesas, carta y plantillas de ejemplo)
3. En **Project Settings → API** copiar la URL, la clave `anon` y la clave `service_role`.

Antes de usarlo con un local real, editar en `supabase/seed.sql` (o luego en `/admin/configuracion`)
el país (ISO 2 letras), la zona horaria y la moneda: definen el prefijo telefónico y los formatos.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
Dejar `WHATSAPP_PROVIDER=mock` para probar sin cuenta de Meta: los mensajes se simulan y se ven en la consola.

### 3. Dependencias y primer usuario

```bash
npm install
```

```bash
npm run crear-usuario -- --email admin@demo.com --password "cambiar123" --rol admin --local demo --nombre "Admin"
```

Roles: `admin` (todo), `encargado` (panel sin configuración), `mesero` (solo canje de cupones).

### 4. Correr

```bash
npm run dev
```

- Panel: http://localhost:3000/admin
- Imprimir los QR: http://localhost:3000/admin/mesas/imprimir
- Simular un cliente: abrir el enlace de cualquier mesa desde `/admin/mesas` en el celular o en otra pestaña.

## Flujo de prueba completo (con proveedor mock)

1. Entrar a `/admin/mesas`, abrir el enlace de la mesa 1.
2. Completar nombre, teléfono y consentimiento. Aparece el código del cupón; en la consola del servidor se ve el
   envío simulado del WhatsApp de bienvenida.
3. En `/mesero`, canjear ese código.
4. Repetir el registro con 3 o 4 teléfonos distintos.
5. En `/admin/campanas/nueva`: elegir "Promo de hoy", segmento "Toda la base", calcular destinatarios, completar
   las variables y crear la campaña.
6. En la página de la campaña, "Enviar siguiente lote". Los envíos pasan a `entregado` (el mock lo simula).
7. Volver a escanear con uno de esos teléfonos: la visita queda atribuida a la campaña (ficha del cliente y
   KPI "Visitas atribuidas").

## Conectar WhatsApp de verdad

1. Crear una app en [Meta for Developers](https://developers.facebook.com/) con el producto WhatsApp y un
   número propio (no puede estar en uso en la app WhatsApp normal).
2. Crear y enviar a aprobación las plantillas. Los nombres, idioma y cuerpo deben coincidir con los cargados en
   `/admin/plantillas`. Las variables `nombre` y `local` se completan solas; el resto se pide al crear la campaña.
   Toda plantilla de marketing debe incluir cómo darse de baja (el webhook procesa "BAJA").
3. En `.env.local`: `WHATSAPP_PROVIDER=meta`, `WHATSAPP_TOKEN` (token permanente de sistema),
   `WHATSAPP_PHONE_NUMBER_ID` y `WHATSAPP_VERIFY_TOKEN`.
4. Configurar el webhook en Meta apuntando a `https://TU-DOMINIO/api/whatsapp/webhook` con el verify token, y
   suscribirse al campo `messages`.
5. En `/admin/configuracion`, cargar el Phone Number ID del local y el costo por mensaje de tu país
   (tarifa de conversación de marketing de Meta) para que el costo estimado sea real.

Límites a tener en cuenta: los números nuevos tienen un tope diario de destinatarios que sube con el uso; los
envíos se hacen en lotes de `WHATSAPP_LOTE` (50 por defecto) y se puede repetir el envío hasta terminar.

## Cron de campañas programadas

Para campañas con fecha o para terminar envíos largos sin tocar el panel, llamar periódicamente (cada 1 a 5 min):

```bash
curl -X POST https://TU-DOMINIO/api/campanas/procesar -H "x-cron-secret: $CRON_SECRET"
```

En Vercel se puede declarar en `vercel.json` como Cron Job; en otro hosting, con cron-job.org o GitHub Actions.

## Estructura

```
supabase/migrations/0001_init.sql   esquema, índices y RLS
supabase/seed.sql                   local demo, mesas, carta, plantillas
scripts/crear-usuario.ts            alta de usuarios del panel
src/proxy.ts                        sesión y protección de /admin y /mesero
src/lib/auth.ts                     sesión + roles
src/lib/segmentos.ts                cálculo de segmentos y límite de frecuencia
src/lib/campanas.ts                 procesamiento de envíos en lotes
src/lib/whatsapp/                   proveedor mock y Meta Cloud API
src/app/m/[token]/                  flujo público del cliente
src/app/admin/                      panel
src/app/mesero/                     canje de cupones
src/app/api/                        webhook y cron
```

## Seguridad y datos

- Todas las consultas van por el servidor con la clave de servicio y filtran por `local_id`; RLS queda activo
  como defensa adicional.
- El consentimiento se guarda con fecha y texto aceptado. La baja (manual, por webhook o por respuesta BAJA) se
  respeta en el momento del envío, no solo al crear la campaña.
- Un cliente es único por teléfono (E.164) dentro de cada local; el cupón de bienvenida se emite una sola vez.

## Próximas fases

Ver [docs/ANALISIS_DESARROLLO.md](docs/ANALISIS_DESARROLLO.md): captura de consumo (ticket o pedido desde el QR),
segmentos guardados, automatizaciones (cumpleaños, inactivos, ocupación), integración con POS, multi-local con planes.
