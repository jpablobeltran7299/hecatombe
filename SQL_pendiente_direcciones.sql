-- Ejecutar en Supabase → SQL Editor.
-- Feature: hasta 3 direcciones de envío guardadas por cliente (gestionadas
-- en /cuenta, seleccionadas y confirmadas en /checkout).

create table if not exists direcciones (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  telefono text not null,
  calle text not null,
  colonia text not null,
  ciudad text not null,
  estado text not null,
  cp text not null,
  referencias text,
  created_at timestamptz not null default now()
);

alter table direcciones enable row level security;

create policy "Los usuarios ven sus propias direcciones"
  on direcciones for select
  using (auth.uid() = user_id);

create policy "Los usuarios crean sus propias direcciones"
  on direcciones for insert
  with check (auth.uid() = user_id);

create policy "Los usuarios editan sus propias direcciones"
  on direcciones for update
  using (auth.uid() = user_id);

create policy "Los usuarios borran sus propias direcciones"
  on direcciones for delete
  using (auth.uid() = user_id);

-- Snapshot de la dirección elegida al momento de pagar — antes el correo de
-- confirmación releía "perfiles" al llegar el webhook (podía ya no coincidir
-- con lo que el cliente vio al pagar). Ahora queda fijo por pedido.
alter table pedidos add column if not exists direccion_snapshot jsonb;
