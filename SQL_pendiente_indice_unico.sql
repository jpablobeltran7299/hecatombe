-- Ejecutar en Supabase → SQL Editor. Evita que dos webhooks simultáneos
-- puedan crear dos pedidos para el mismo pago de MercadoPago.
-- NULL no cuenta como duplicado (varios pedidos pagados con Hecacoins
-- tienen mp_payment_id = NULL), así que este índice es seguro de aplicar
-- incluso con datos existentes.
create unique index if not exists pedidos_mp_payment_id_unique
  on pedidos (mp_payment_id)
  where mp_payment_id is not null;
