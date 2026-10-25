-- =====================================================================
-- Datos de ejemplo para el local piloto. Ajustar nombre, país y moneda.
-- Ejecutar después de 0001_init.sql.
-- =====================================================================

insert into locales (nombre, slug, pais, zona_horaria, moneda, incentivo_registro)
values ('Café Demo', 'demo', 'CO', 'America/Bogota', 'COP', 'Sumate al club y llevate un postre de regalo')
on conflict (slug) do nothing;

-- 12 mesas, como en el video
insert into mesas (local_id, numero)
select l.id, g.n
from locales l, generate_series(1, 12) as g(n)
where l.slug = 'demo'
on conflict (local_id, numero) do nothing;

-- Carta mínima
insert into productos (local_id, categoria, nombre, descripcion, precio, orden)
select l.id, p.categoria, p.nombre, p.descripcion, p.precio, p.orden
from locales l,
(values
  ('Cafés',    'Espresso',                'Doble, tostado medio',             6000, 1),
  ('Cafés',    'Café con leche',          'Taza grande',                      8000, 2),
  ('Cafés',    'Capuccino',               'Con espuma de leche',              9500, 3),
  ('Panadería','Medialunas (x3)',         'De manteca, recién horneadas',     7000, 1),
  ('Panadería','Tostado de jamón y queso','Pan de miga',                      12000, 2),
  ('Postres',  'Brownie con helado',      'Chocolate 70%',                    14000, 1),
  ('Postres',  'Cheesecake de frutos rojos', 'Porción',                       15000, 2)
) as p(categoria, nombre, descripcion, precio, orden)
where l.slug = 'demo';

-- Plantillas espejo. Los nombres deben coincidir con los aprobados en Meta.
-- Mientras no exista cuenta de WhatsApp, el proveedor "mock" las envía igual.
insert into plantillas (local_id, nombre, nombre_meta, idioma, categoria, cuerpo, variables, estado_aprobacion)
select l.id, p.nombre, p.nombre_meta, 'es', p.categoria, p.cuerpo, p.variables::jsonb, 'aprobada'
from locales l,
(values
  ('Bienvenida al club', 'bienvenida_club', 'utility',
   '¡Hola {{1}}! Ya sos parte del club de {{2}}. Mostrá este código al mesero para tu regalo: {{3}}. Para dejar de recibir mensajes respondé BAJA.',
   '["nombre","local","codigo"]'),
  ('Promo de hoy', 'promo_hoy', 'marketing',
   '{{1}}: {{2}}. Solo hoy, hasta las {{3}}. Te esperamos. Respondé BAJA para no recibir más mensajes.',
   '["local","promo","hora_limite"]'),
  ('Te extrañamos', 'te_extranamos', 'marketing',
   '¡Hola {{1}}! Hace un tiempo que no te vemos en {{2}}. Esta semana: {{3}}. Respondé BAJA para no recibir más mensajes.',
   '["nombre","local","promo"]'),
  ('Cumpleaños', 'cumpleanos_club', 'marketing',
   '¡Feliz cumpleaños {{1}}! En {{2}} te esperamos con {{3}}. Válido toda la semana. Respondé BAJA para no recibir más mensajes.',
   '["nombre","local","regalo"]')
) as p(nombre, nombre_meta, categoria, cuerpo, variables)
where l.slug = 'demo'
on conflict (local_id, nombre_meta, idioma) do nothing;
