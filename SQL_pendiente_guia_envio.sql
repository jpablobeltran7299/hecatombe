-- Ejecutar en Supabase → SQL Editor.
-- Guarda la guía de envío real generada con Solo Envíos para cada pedido:
-- número de rastreo, link de la guía en PDF y estado.
alter table pedidos add column if not exists guia jsonb;
