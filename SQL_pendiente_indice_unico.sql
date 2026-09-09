-- Ejecutar en Supabase → SQL Editor. Evita que dos webhooks simultáneos
-- puedan crear dos pedidos para el mismo pago de MercadoPago.
-- NULL no cuenta como duplicado (varios pedidos pagados con Hecacoins
-- tienen mp_payment_id = NULL), así que este índice es seguro de aplicar
-- incluso con datos existentes.
create unique index if not exists pedidos_mp_payment_id_unique
  on pedidos (mp_payment_id)
  where mp_payment_id is not null;

-- Registro de clientes interesados en una preventa que ya se quedó sin
-- piezas disponibles (stock en 0). Se lee/escribe solo vía rutas API con
-- SUPABASE_SERVICE_KEY (app/api/preventa-interes y
-- app/api/admin/preventa-interes), así que no requiere configurar RLS.
create table if not exists interesados_preventa (
  id bigint generated always as identity primary key,
  producto_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (producto_id, user_id)
);
