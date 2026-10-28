# Resumen del proyecto — Hecatombe

_Generado: 2026-10-15_

## 1. Qué es

E-commerce construido con **Next.js 16.2.1** (App Router) + **React 19.2.4**. Estilos con Tailwind v4 y styled-components. Parte del código en TypeScript.

## 2. Stack e integraciones

- **CMS de contenido/catálogo**: Sanity v4 (`sanity/schemaTypes`: banner, configuracion, dinamica, linea, marca, producto, tematica, universo). Studio embebido en `/studio`.
- **Base de datos relacional / Auth**: Supabase (usuarios, pedidos, clientes).
- **Pagos**: MercadoPago (`mercadopago` SDK + `@mercadopago/sdk-react`), checkout y webhook propios.
- **Envíos**: integración propia con **Solo Envíos** (`lib/soloenvios.js`), sin SDK oficial — cotización y generación de guías, incluye flujo especial "Bodegatombe" (bodega).
- **Email transaccional**: Resend (`lib/emailTemplates.js`).
- **Otros**: `@dnd-kit` (drag & drop en admin), `react-window` (listas virtualizadas), `xlsx`/`csv-parse` (import/export), `cheerio`/`axios` (scraping/HTTP).
- **Loyalty**: sistema de puntos "hecacoins" (`lib/hecacoins.js`).
- **Deploy**: Vercel. Cron configurado en `vercel.json`: `/api/cron/carrito-abandonado` diario a las 15:00 UTC (emails de carrito abandonado).

## 3. Estructura relevante

- `app/` — catálogo, producto/[id], carrito, checkout, cuenta, login, registro, dinamicas (promos), studio.
- `app/admin/` — panel admin: banners, bodega, clasificacion, clientes, configuracion, dinamicas, inventario, marcas, pedidos, productos.
- `app/api/` — checkout, webhook (MercadoPago), cotizar-envio(-bodega), solicitar-envio-bodega, preventa-interes, clasificacion, cron/carrito-abandonado, y `api/admin/*` (banner, configuracion, cotizar-envio-*, dinamica, generar-envio(-bodega), historial, marca, notificar-llegada, preventa-interes, producto(s), descuento-masivo, registrar-guia-manual(-bodega), saldo-envios, stock, upload).
- `lib/` — adminAuth.js, adminFetch.js, alertas.js, auth.js, constants.js (lista `ADMINS`), emailTemplates.js, envios.js, estadoPedido.js, hecacoins.js, paquetes.js, pedidos.js, sanity.js/sanityAdmin.js, soloenvios.js, supabase.js.

**Autenticación admin**: `lib/adminAuth.js` → `requireAdmin()` valida sesión Supabase + email dentro del allowlist `ADMINS` en `lib/constants.js`. (Antes era solo gating de cliente — corregido por una vulnerabilidad IDOR, commit `b9b5794`.)

## 4. Variables de entorno

Usadas en el código:
CRON_SECRET, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET, NEXT_PUBLIC_SANITY_API_VERSION, NEXT_PUBLIC_SANITY_DATASET, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, RESEND_API_KEY, SANITY_WRITE_TOKEN, SOLOENVIOS_CLIENT_ID, SOLOENVIOS_CLIENT_SECRET, SOLOENVIOS_ENV, SOLOENVIOS_ORIGEN_ID, SOLOENVIOS_SANDBOX_CLIENT_ID, SOLOENVIOS_SANDBOX_CLIENT_SECRET, SOLOENVIOS_SANDBOX_ORIGEN_ID, SUPABASE_SERVICE_KEY.

Configuradas en `.env.local`: todas las anteriores **excepto `MERCADOPAGO_WEBHOOK_SECRET`** (pendiente real, ver abajo). También presentes: `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`, `VERCEL_OIDC_TOKEN`.

> No se incluyen valores reales de secretos en este documento, solo los nombres.

## 5. Pendientes conocidos

- **`MERCADOPAGO_WEBHOOK_SECRET` no está configurado en Vercel.** Falta setearlo en producción (solo pendiente de configuración, no de código).

## 6. Historial reciente (features en desarrollo activo)

- Envíos: cotización en tiempo real y generación de guías vía Solo Envíos, tanto para pedidos normales como flujo de bodega ("Bodegatombe").
- Checkout/webhook: fixes de `external_reference` de MercadoPago, corrección de IDOR, fixes de reembolso/idempotencia en hecacoins.
- Emails: ajuste de tono de marca, copias para admins, notificaciones de envío.
- Admin UX: tabs colapsables, lista de clientes virtualizada, agrupación del panel por frecuencia de uso.

## 7. Notas de código

- `lib/emailTemplates.js:125` — BCC oculto a `jpablobeltran7299@gmail.com` en cada email a clientes. Es intencional, no un TODO pendiente.
- No hay README específico del proyecto; sigue siendo el boilerplate default de `create-next-app`.
