-- Ejecutar en el SQL Editor de Supabase.
-- lib/hecacoins.js asume una sola fila por usuario en `hecacoins` (usa
-- .single() al leerla) y depende de este índice para detectar —en vez de
-- ignorar en silencio— cuando dos compras casi simultáneas del mismo
-- usuario nuevo intentan crear esa fila al mismo tiempo.
create unique index if not exists hecacoins_user_id_key
  on hecacoins (user_id);
