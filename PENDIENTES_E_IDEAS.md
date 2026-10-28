# Pendientes e ideas a futuro — Hecatombe

_Generado: 2026-10-15. Complementa a `RESUMEN_PROYECTO.md`._

> Nota: algunos puntos vienen de memoria de conversaciones anteriores (hasta 36 días de antigüedad) y de mensajes de commits — están marcados cuando no se pudo verificar 100% contra el código/infra actual.

---

## 1. Pendientes técnicos concretos (acción clara, falta ejecutarse)

### 1.1 Variable de entorno faltante en Vercel
- **`MERCADOPAGO_WEBHOOK_SECRET`** — no está configurada en Vercel (Production). Confirmado: está en todas las demás variables de `.env.local` menos esta.
  - **Por qué importa**: `app/api/webhook/route.jsx` tiene `validarFirmaMercadoPago()` para verificar que las notificaciones de pago realmente vienen de MercadoPago. Sin la variable, el código omite la validación (`console.warn`) — el webhook sigue funcionando, pero sin esa capa extra contra notificaciones falsificadas.
  - **Cómo completarlo**: 1) obtener la clave desde el dashboard de MercadoPago → sección Webhooks de la app "Hecatombe WEB" (la última vez costó encontrar esa sección en el menú); 2) agregarla en Vercel → Settings → Environment Variables → `MERCADOPAGO_WEBHOOK_SECRET` (tipo Secret, entorno Production).
  - **Estado**: dejado pendiente a propósito por el usuario el 2026-09-09, no urgente.

### 1.2 Scripts SQL pendientes de correr en Supabase
Existen 3 archivos `SQL_pendiente_*.sql` en la raíz del repo. No hay forma de confirmar desde el código si ya se corrieron en Supabase (no hay credenciales de DB para verificar DDL directamente) — **hay que confirmar manualmente en el SQL Editor de Supabase si cada índice/tabla ya existe**.

1. **`SQL_pendiente_indice_unico.sql`** — índice único `pedidos_mp_payment_id_key` sobre `pedidos.mp_payment_id` (ignora NULLs). Evita pedidos duplicados cuando llegan dos notificaciones de MercadoPago casi simultáneas para el mismo pago. El webhook (`app/api/webhook/route.jsx`) ya confía en este índice y maneja el código de error `23505` (conflicto) esperando que exista.
2. **`SQL_pendiente_checkout_pendientes.sql`** — tabla `checkout_pendientes` (id, payload jsonb, created_at), con RLS activado (cerrado, solo backend con service key). Parte del fix del bug de `external_reference` largo que rompía pagos de MercadoPago.
3. **`SQL_pendiente_indice_unico_hecacoins.sql`** — índice único `hecacoins_user_id_key` sobre `hecacoins.user_id`. `lib/hecacoins.js` asume una sola fila por usuario (usa `.single()`) y depende de este índice para **detectar** (no ignorar en silencio) cuando dos compras casi simultáneas de un usuario nuevo intentan crear esa fila a la vez.

   **Riesgo si no están corridos**: sin estos índices, los mecanismos de idempotencia que el código ya asume (manejo de `23505`, `.single()`) podrían no estar realmente protegiendo contra condiciones de carrera — es decir, el código "cree" que el índice existe pero si no corrió, el bug que se intentó arreglar podría seguir latente.

4. **Tabla `interesados_preventa`** (mencionada en memoria anterior, 2026-09-09) — necesaria para que `/api/preventa-interes` y `/api/admin/preventa-interes` funcionen (registrar interés en preventas agotadas). Ya no hay un archivo `.sql` para ella en el repo (pudo haberse corrido y limpiado, o pudo perderse el script). **Verificar si la tabla existe en Supabase**; si no existe, esas dos rutas fallarán en producción.

---

## 2. Historial de decisiones "temporales" que podrían revisarse

Estas no son bugs, son decisiones de producto/negocio tomadas sobre la marcha que valdría la pena revisar si las condiciones cambiaron:

- **Cotización de envío**: hubo idas y vueltas — se implementó cotización real con Solo Envíos (`c0f665a`), se desactivó temporalmente en checkout volviendo a flat $180 (`fcfdb26`), y el commit más reciente (`b893e3d`) **oculta la cotización automática en `admin/pedidos`**. Vale la pena confirmar con el usuario si el ocultamiento en admin es definitivo o es un parche temporal mientras se estabiliza algo de Solo Envíos.
- **Diagnóstico de septiembre 2026**: hubo un periodo (`a53e1b1`, `8984d03`) donde se subió temporalmente el checkout viejo (pre-15 sept) a producción para diagnosticar un problema, y luego se revirtió. Confirmar que no quedó código "de diagnóstico" mezclado — revisar si hace falta una limpieza final de ese incidente.

---

## 3. Ideas a futuro (no son pendientes urgentes, son oportunidades)

Inferidas del patrón de desarrollo reciente y de partes del sistema que quedaron "mínimas" a propósito:

1. **Webhook de MercadoPago — firma completa**: una vez completado el punto 1.1, considerar agregar alertas/monitoreo si en el futuro llega una notificación con firma inválida (señal de intento de fraude), no solo loguearla.
2. **Panel de envíos (Solo Envíos)**: dado que ya existe saldo visible en `admin/pedidos` (`f805528`) y generación de guías, una mejora natural sería un dashboard dedicado de envíos (guías pendientes de generar, guías con error, saldo histórico) en vez de tenerlo dentro de pedidos.
3. **Bodegatombe**: el flujo de bodega ha recibido bastante atención (tracking por pieza vía `destino`/`bodega_estado`, envío real gratis/pagado). Posible siguiente paso: notificaciones automáticas al cliente cuando acumula piezas suficientes para enviar gratis, o un resumen visual de "cuánto llevas ahorrado en bodega".
4. **Hecacoins**: ya se corrigieron bugs de idempotencia y reembolsos ignorados (`0b87f74`). Ideas a futuro: vencimiento de puntos, historial visible para el cliente en `/cuenta`, o reglas de acumulación distintas por tipo de producto.
5. **Carrito abandonado**: ya existe el cron diario (`c5959c8`). Se podría evolucionar a una secuencia de 2-3 recordatorios espaciados en vez de uno solo, o segmentar por valor del carrito.
6. **Clasificación de catálogo**: dado que ya hay temáticas/universos/líneas/marcas, una idea a futuro es un sistema de recomendación simple ("también te puede interesar") basado en esa taxonomía ya existente, sin necesidad de ML.
7. **Admin**: panel ya se reorganizó por frecuencia de uso con tabs colapsables (`45a6913`, `fc436d1`). Continuar esa línea: buscador global dentro del admin, o atajos de teclado para las acciones más repetidas (cambiar estado de pedido, generar guía).
8. **Preventas**: existe registro de interés para preventas agotadas (`744af88`) y aviso de llegada (`d179c05`). Idea a futuro: notificar automáticamente por email/WhatsApp a quienes registraron interés en cuanto se reabre stock, en vez de requerir acción manual del admin.
9. **Seguridad**: ya se blindaron varias rutas (IDOR en checkout/envíos `b9b5794`, rutas `/api/admin/*` sin verificación de sesión `d04e203`, `/api/clasificacion` `9ec4384`). Vale la pena un barrido final de todas las rutas en `app/api/` para confirmar que ninguna quedó sin `requireAdmin()` donde corresponde — especialmente las agregadas más recientemente (cotizar-envio-bodega, solicitar-envio-bodega, registrar-guia-manual-bodega).

---

## 4. Cosas a confirmar con el usuario (no se pudo determinar solo con el código)

- ¿El ocultamiento de "cotizar envío automático" en `admin/pedidos` (commit `b893e3d`) es definitivo o temporal?
- ¿Ya se corrieron los 3 scripts SQL pendientes listados en la sección 1.2? ¿Existe la tabla `interesados_preventa`?
- ¿Sigue pendiente a propósito `MERCADOPAGO_WEBHOOK_SECRET`, o ya es momento de configurarla?
