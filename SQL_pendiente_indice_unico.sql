-- Ejecutar en el SQL Editor de Supabase.
-- Evita pedidos duplicados cuando llegan dos notificaciones de Mercado Pago
-- casi al mismo tiempo para el mismo pago (el webhook ya confía en este
-- índice — ver app/api/webhook/route.jsx, manejo del código de error 23505).
-- El índice ignora los NULL (pedidos pagados con Hecacoins no tienen
-- mp_payment_id), así que no bloquea esos inserts.
create unique index if not exists pedidos_mp_payment_id_key
  on pedidos (mp_payment_id)
  where mp_payment_id is not null;
