-- Ejecutar en Supabase → SQL Editor.
-- Guarda el detalle de la cotización de envío real (Solo Envíos) elegida
-- por el cliente en el checkout: proveedor, servicio, tarifa y días.
alter table pedidos add column if not exists envio_cotizacion jsonb;
