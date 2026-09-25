-- Ejecutar en el SQL Editor de Supabase antes de probar/desplegar el fix
-- del external_reference largo que rompía los pagos de Mercado Pago.
create table if not exists checkout_pendientes (
  id bigserial primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Solo se accede desde el backend con la service key, así que RLS cerrado.
alter table checkout_pendientes enable row level security;
