# Análisis de desarrollo: sistema de fidelización por QR para restaurantes

Fuente: reel de @iman.solutions "El sistema de 5 pasos para llenar tu local un lunes a las 17 h" (video_modelo_negocio.mp4, 62 s).
Fecha del análisis: 2026-10-24.

---

## 1. Qué muestra el video

Animación explicativa en 12 secciones. No muestra software real; muestra el flujo conceptual.

| # | Sección | Contenido en pantalla |
|---|---------|------------------------|
| 01 | El sistema | "5 pasos". Grilla de 12 mesas que se llenan. Etiquetas "lunes · 17:00" y "$0 en publicidad". |
| 02 | El mapa | Diagrama vertical con los 5 pasos encadenados. |
| 03 | La mesa | Paso 1: "Escanea el QR. La carta le ofrece: sumate al club y llevate un postre". |
| 04 | El club | Paso 2: "Se suma en 10 s. Nombre + teléfono · sin descargar nada". |
| 05 | Tu base | Paso 3: "Entra a tu base. Qué pidió · cuándo vino · cuánto gastó". |
| 06 | Todos los días | "Se repite en cada mesa, todos los días". Contador sube de 0 a **+340 clientes en tu base · en un mes**. |
| 07 | El momento | Paso 4: "Esperás el momento flojo. Lunes · 17:00 · salón vacío". |
| 08 | El mensaje | Paso 5: "Mensaje a toda tu base". Notificación: "TU LOCAL · AHORA — 2x1 en café con medialunas. Solo hoy, hasta las 20 h." |
| 09 | Las mesas | "Las mesas se llenan". La grilla pasa de vacía a llena. |
| 10 | Y más | Otros disparadores: **cumpleaños**, **plato nuevo**, **eventos**, **el que no viene hace un mes**. |
| 11 | La diferencia | "No dependés del algoritmo para llegar a tus clientes. Les hablás directo." |
| 12 | Comentá | Llamado a la acción: comentar "SISTEMA" para recibir info (ellos venden el sistema a medida). |

**Lo que el video revela y la descripción no decía**

- El incentivo de registro es un **postre de regalo** ofrecido desde la carta. El QR es el de la carta digital, no un QR aparte.
- El registro se promete en **10 segundos**: solo nombre y teléfono, sin app.
- La cifra de referencia es **~340 registros al mes** para un local de 12 mesas. Da unos 11 registros/día.
- El mensaje de ejemplo es de **urgencia acotada** (solo hoy, hasta las 20 h) con promoción concreta (2x1).
- La notificación se dibuja como push/WhatsApp con remitente "TU LOCAL". El canal real es WhatsApp.
- Hay cuatro tipos de campaña además del "momento flojo": cumpleaños (requiere fecha de nacimiento), plato nuevo, eventos y reactivación de inactivos (requiere historial de visitas).

**Lo que el video no explica (y hay que decidir)**

- Cómo se captura "qué pidió" y "cuánto gastó". No se ve ningún POS ni pedido digital.
- Cómo se evita el fraude del postre gratis (un cliente registrándose varias veces).
- Cómo se gestiona el consentimiento y la baja de los mensajes.
- Qué pasa con el cliente que ya está registrado y vuelve a escanear.

---

## 2. Alcance funcional

### Módulos

1. **Mesas y QR**: alta de mesas, generación de QR por mesa con URL única, impresión.
2. **Carta digital** (mínima): página pública con el menú. Sirve de "excusa" para el escaneo y aloja el banner del club.
3. **Registro al club**: formulario de nombre + teléfono + consentimiento. Opcional: fecha de cumpleaños. Verificación por WhatsApp (OTP o enlace) para evitar teléfonos falsos.
4. **Cupón de bienvenida**: código o pantalla que el mesero valida para entregar el postre. Un solo uso por teléfono.
5. **Base de clientes (CRM)**: ficha por cliente con visitas, consumo, última visita, cumpleaños, estado de consentimiento.
6. **Captura de consumo**: ver sección 4. Es el módulo con más decisiones abiertas.
7. **Campañas**: redactar mensaje, elegir segmento, programar o enviar ahora, ver resultados.
8. **Segmentos**: toda la base, inactivos hace N días, cumpleaños de la semana, clientes frecuentes, por día/hora habitual de visita.
9. **Automatizaciones** (fase 3): reglas tipo "si el salón está por debajo del X% a las 17 h un lunes, enviar campaña Y".
10. **Dashboard**: registros por día, tamaño de la base, campañas enviadas, retorno por campaña (visitas en las 48 h posteriores).

### Actores

| Actor | Dispositivo | Qué hace |
|---|---|---|
| Cliente | Su celular, navegador | Escanea, se registra, recibe mensajes, canjea cupón |
| Mesero / caja | Tablet o celular del local | Valida cupones, asocia tickets a clientes (según opción de consumo) |
| Dueño / encargado | PC o celular | Ve la base, lanza campañas, mira métricas |
| Super admin (si es multi-local) | PC | Alta de locales, planes, facturación |

---

## 3. Flujos principales

### Flujo A: registro en mesa

1. Cliente escanea QR de la mesa 7 y abre `https://app/{local}/m/{token_mesa}`.
2. Se muestra la carta con un banner: "Sumate al club y llevate un postre".
3. Formulario: nombre, teléfono (con prefijo país), casilla de consentimiento, opcional cumpleaños.
4. Backend valida teléfono, crea o recupera cliente, registra visita (fecha, hora, mesa).
5. Se envía por WhatsApp un mensaje de bienvenida con el cupón. Esto confirma además que el número es real.
6. Pantalla muestra el cupón; el mesero lo marca como canjeado desde su vista.

Caso borde: cliente ya registrado que vuelve a escanear. Se reconoce por teléfono (o cookie), se registra una nueva visita y no se repite el regalo.

### Flujo B: campaña en momento flojo

1. Encargado abre el panel, ve "hoy lunes 17:00, 2 de 12 mesas ocupadas".
2. Crea campaña: plantilla "promo_hoy" con variables {promo} y {hora_limite}.
3. Elige segmento (toda la base, o "no vino en 30 días", o "suele venir entre semana").
4. Vista previa, costo estimado (N destinatarios × tarifa), confirmar.
5. El sistema envía en lotes respetando límites de la API y guarda estado por destinatario.
6. Cada visita registrada en las siguientes 48 h de un destinatario cuenta como retorno de campaña.

### Flujo C: automatizaciones (fase 3)

- Cumpleaños: cada mañana, enviar plantilla a clientes que cumplen en los próximos 2 días.
- Inactivos: semanalmente, enviar plantilla a quienes no visitan hace 30 días.
- Plato nuevo / evento: campaña manual con segmento elegido.

---

## 4. Captura de consumo: opciones

El video promete "qué pidió y cuánto gastó" pero no muestra cómo. Opciones por orden de complejidad:

| Opción | Cómo | Pros | Contras |
|---|---|---|---|
| A. Solo visitas | Registrar escaneo = visita | Se construye en días; alcanza para recencia, frecuencia y cumpleaños | Sin ticket promedio ni productos |
| B. Mesero asocia ticket | Al cerrar la mesa, el mesero carga total y opcionalmente ítems contra la mesa/cliente | Barato, sin integración | Depende de disciplina del equipo; carga manual |
| C. Pedido desde el QR | La carta digital permite pedir; el pedido queda ligado al cliente | Dato completo y automático | Cambia la operación del salón; más desarrollo |
| D. Integración con POS | Webhook o lectura periódica del sistema de caja, matching por mesa y hora | Dato completo sin cambiar operación | Depende del POS del local; cada POS es una integración distinta |

**Recomendación**: arrancar con A, sumar B como opción manual barata, y evaluar C o D según el local piloto.

---

## 5. Modelo de datos (PostgreSQL)

```
locales          id, nombre, slug, telefono_whatsapp, zona_horaria, plan
usuarios         id, local_id, email, rol (admin|encargado|mesero)
mesas            id, local_id, numero, token_qr (único), activa
clientes         id, local_id, telefono (E.164), nombre, fecha_nacimiento,
                 consentimiento_marketing (bool), consentimiento_fecha, origen,
                 opt_out_fecha, creado_en
                 UNIQUE (local_id, telefono)
visitas          id, cliente_id, mesa_id, inicio, fin, total (nullable), origen (qr|manual|pos)
pedidos_items    id, visita_id, nombre_producto, cantidad, precio   -- solo opciones B/C/D
cupones          id, cliente_id, tipo (bienvenida|campaña), codigo, estado, canjeado_en, canjeado_por
plantillas       id, local_id, nombre_meta, cuerpo, variables (json), estado_aprobacion
campanas         id, local_id, plantilla_id, segmento (json), programada_para,
                 estado (borrador|enviando|enviada), creada_por
envios           id, campana_id, cliente_id, estado (pendiente|enviado|entregado|leido|fallido),
                 wamid, error, enviado_en
eventos_webhook  id, local_id, payload (json), recibido_en   -- estados de WhatsApp
```

Índices clave: `clientes(local_id, telefono)`, `visitas(cliente_id, inicio)`, `envios(campana_id, estado)`.

Los segmentos se calculan con consultas sobre `visitas`: última visita, cantidad de visitas en 90 días, día de semana más frecuente, gasto promedio si existe `total`.

---

## 6. Arquitectura y stack

```
[Celular cliente] --QR--> [Web pública: carta + registro]  (Next.js, SSR, sin login)
                                   |
                                   v
                          [API / backend]  (Next.js route handlers o NestJS)
                                   |
            +----------------------+----------------------+
            v                      v                      v
     [PostgreSQL]        [WhatsApp Cloud API]       [Cola de envíos]
     (Supabase)           (Meta, plantillas)         (pg-boss sobre Postgres
                                   ^                  o BullMQ/Redis)
                                   |
                          [Webhook de estados]

[Panel admin]  (Next.js, auth Supabase, roles)  --> misma API
[Vista mesero] (misma app, ruta móvil simplificada)
```

| Capa | Elección | Motivo |
|---|---|---|
| Frontend público y panel | Next.js + Tailwind | Un solo proyecto, SSR rápido en celular, fácil de desplegar |
| Backend | Route handlers de Next.js (MVP) o NestJS separado (si crece) | Simplicidad inicial |
| Base de datos y auth | Supabase (Postgres + Auth + Row Level Security) | Multi-local con RLS por `local_id` |
| Mensajería | WhatsApp Cloud API oficial | Sin riesgo de baneo del número; estados de entrega por webhook |
| Cola | pg-boss (Postgres) en MVP; BullMQ si el volumen crece | Envíos en lotes con reintentos |
| QR | librería `qrcode`; PDF de impresión con etiqueta de mesa | |
| Hosting | Vercel + Supabase | Costo casi nulo al inicio |
| Observabilidad | Logs de envíos en DB + Sentry | Diagnóstico de fallos de entrega |

**Multi-tenant desde el día 1**: aunque el piloto sea un local, el modelo de negocio del video (vender el sistema a muchos locales) exige `local_id` en todas las tablas y RLS.

---

## 7. WhatsApp: lo que condiciona el diseño

- **Cuenta**: Meta Business + número dedicado. El número no puede estar en uso en la app WhatsApp normal.
- **Opt-in**: Meta exige consentimiento previo. El registro en el QR es el opt-in; hay que guardar fecha y texto aceptado.
- **Plantillas**: los mensajes iniciados por el negocio usan plantillas aprobadas por Meta (categoría marketing). La aprobación tarda de minutos a 24 h. Las variables se rellenan en el envío. No se puede mandar texto libre a quien no escribió en las últimas 24 h.
- **Costo**: las conversaciones de marketing se cobran por destinatario, con tarifa por país. Con 340 clientes y 4 campañas al mes el costo es manejable, pero el panel debe mostrar el costo estimado antes de confirmar.
- **Límites de envío**: los números nuevos arrancan con un tope diario (del orden de 250 a 1 000 destinatarios) que sube con el uso. La cola debe respetarlo.
- **Baja**: cada plantilla de marketing debe ofrecer forma de darse de baja (botón "No recibir más" o respuesta "BAJA"). El webhook procesa la respuesta y marca `opt_out_fecha`.
- **Calidad**: muchas quejas bajan la calificación del número y pueden bloquearlo. Limitar frecuencia por cliente (por ejemplo, máximo 2 campañas por semana).

Alternativa: SMS vía Twilio como canal de respaldo. Más caro por mensaje, sin plantillas, menor tasa de lectura.

---

## 8. Plan por fases

### Fase 1: MVP (2 a 3 semanas, un local piloto)

- Alta de local, mesas y QR imprimibles.
- Carta digital estática (PDF o lista simple) con banner del club.
- Registro: nombre, teléfono, consentimiento, cumpleaños opcional. Mensaje de bienvenida con cupón.
- Vista mesero para canjear cupón.
- Base de clientes con visitas (opción A).
- Campaña manual a toda la base o a inactivos N días, con plantilla aprobada y costo estimado.
- Webhook de estados de entrega.
- Dashboard mínimo: registros por día, tamaño de la base, entregados/leídos por campaña.

Resultado medible: ¿se alcanzan ~10 registros/día? ¿Cuántos destinatarios vuelven en 48 h tras una campaña?

### Fase 2: consumo y segmentación (3 a 4 semanas)

- Carga manual de ticket por mesero (opción B) o pedido desde QR (opción C), según piloto.
- Segmentos guardados: frecuentes, inactivos, cumpleaños, por día habitual.
- Ticket promedio y gasto acumulado por cliente.
- Atribución de retorno por campaña (visitas en ventana de 48 h).

### Fase 3: automatizaciones y producto (4+ semanas)

- Reglas automáticas: cumpleaños, inactivos, momento flojo por ocupación.
- Integración con POS para locales que lo pidan (opción D).
- Multi-local con planes y facturación.
- A/B de mensajes.

---

## 9. Riesgos y decisiones abiertas

| Riesgo / decisión | Impacto | Mitigación |
|---|---|---|
| Teléfonos falsos para cobrar el postre | Base sucia, costo de envíos desperdiciado | El cupón llega por WhatsApp: si el número no recibe, no hay postre |
| Mismo cliente, varios registros | Duplicados | UNIQUE por teléfono normalizado E.164 |
| Baja tasa de registro | El sistema no acumula base | Medir conversión escaneo a registro; probar incentivos |
| Costo de WhatsApp escala con la base | Margen | Mostrar costo antes de enviar; segmentar en lugar de "toda la base" |
| Rechazo de plantillas por Meta | Campaña bloqueada | Biblioteca de plantillas pre-aprobadas genéricas |
| Legal: datos personales | Multas, confianza | Consentimiento explícito guardado, baja en un clic, política de privacidad en el formulario. Verificar la ley del país donde opera el local |
| Operación del salón | Meseros no validan cupones ni cargan tickets | Vista mesero en 2 toques; capacitación; empezar con opción A |
| Dependencia de un número de WhatsApp | Bloqueo = sistema caído | Respetar límites y frecuencia; SMS como respaldo |

Decisiones a tomar antes de arrancar:

1. País del piloto (define prefijo telefónico, ley de datos, tarifa de WhatsApp).
2. Opción de captura de consumo para la fase 2.
3. Si la carta digital ya existe en el local o se construye.
4. Producto propio para un local o plataforma multi-local desde el inicio (afecta auth y facturación).

---

## 10. Métricas que validan el modelo

- Escaneos por día y conversión escaneo a registro.
- Registros por día (meta de referencia del video: ~11/día).
- Tamaño de la base activa (con consentimiento vigente).
- Por campaña: enviados, entregados, leídos, bajas, costo, visitas atribuidas en 48 h, ingreso atribuido (si hay consumo).
- Ocupación en franjas flojas antes y después de las campañas.
- Tasa de baja mensual (si supera ~2%, la frecuencia o el contenido están mal).
