-- Ejecutar en Supabase → SQL Editor.
-- Bodegatombe con envío real: agrega un estado intermedio "solicitado"
-- entre "guardando" y "enviado" (bodega_estado), usado mientras se
-- cotiza/genera la guía combinada de varios pedidos.

-- Marca si la solicitud fue gratis (ya llegó a $1,200) o pagada (adelantada).
alter table pedidos add column if not exists bodega_tipo_solicitud text;

-- ID del pago de Mercado Pago que cubrió el envío anticipado — separado de
-- mp_payment_id (que ya tiene un índice único y representa el pago del
-- PRODUCTO de ese pedido, no el del envío compartido entre varios pedidos).
alter table pedidos add column if not exists bodega_envio_mp_payment_id text;
