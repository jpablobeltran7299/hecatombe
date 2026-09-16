-- Ejecutar en Supabase → SQL Editor. UNA SOLA VEZ.
-- Antes de la función de "hasta 3 direcciones", cada cliente tenía su
-- dirección guardada directamente en "perfiles". Esos clientes se
-- quedaron sin ninguna dirección visible en /cuenta después del cambio —
-- este script copia esa dirección vieja a la tabla nueva "direcciones",
-- solo para quien todavía no tenga ninguna ahí (no duplica nada si ya
-- agregó una manualmente).

insert into direcciones (user_id, nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias)
select
  p.user_id,
  coalesce(p.nombre, ''),
  coalesce(p.apellido, ''),
  coalesce(p.telefono, ''),
  p.calle,
  coalesce(p.colonia, ''),
  coalesce(p.ciudad, ''),
  coalesce(p.estado, ''),
  coalesce(p.cp, ''),
  p.referencias
from perfiles p
where p.calle is not null and trim(p.calle) <> ''
  and not exists (select 1 from direcciones d where d.user_id = p.user_id);
