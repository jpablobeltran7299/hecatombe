// Tabla de productos (foto, nombre, cantidad, precio) — compartida entre el
// correo del cliente y el de los admins para que ambos muestren lo mismo.
export function tablaProductosHtml(items = []) {
  if (items.length === 0) return ''
  const filas = items.map(item => `
    <tr>
      <td style="padding:0 0 12px;width:56px;">
        ${item.pictureUrl
          ? `<img src="${item.pictureUrl}" width="56" height="56" alt="${item.title}" style="display:block;border-radius:8px;object-fit:cover;background:#222;">`
          : `<div style="width:56px;height:56px;border-radius:8px;background:#222;"></div>`
        }
      </td>
      <td style="padding:0 0 12px 12px;vertical-align:top;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:700;">${item.title}</p>
        <p style="margin:2px 0 0;color:#888;font-size:12px;">Cantidad: ${item.quantity}</p>
      </td>
      <td style="padding:0 0 12px;vertical-align:top;text-align:right;white-space:nowrap;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:700;">$${(item.unitPrice * item.quantity).toLocaleString('es-MX')} MXN</p>
      </td>
    </tr>
  `).join('')

  return `
    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td colspan="3" style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:16px;">Productos</td></tr>
      ${filas}
    </table>
  `
}

// Plantilla HTML con la marca de Hecatombe para los correos de confirmación
// que recibe el cliente — compartida entre /api/checkout y /api/webhook para
// que nunca se vuelva a mandar un correo de confirmación en texto plano.
export function plantillaConfirmacionCliente({
  nombreCliente,
  pedidoId,
  monto,
  esApartado = false,
  esBodega = false,
  montoLiquidacion = null,
  costoEnvio = 0,
  proveedorEnvio = null,
  direccion = 'No proporcionada',
  notaExtra = null,
  items = [], // [{ title, quantity, unitPrice, pictureUrl }]
  subtotal = null,
  descuentoHecacoins = 0,
}) {
  const tablaProductos = tablaProductosHtml(items)

  const tablaResumen = subtotal !== null ? `
    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
      <tr><td colspan="2" style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Resumen</td></tr>
      <tr><td style="color:#aaa;font-size:13px;padding-bottom:6px;">Subtotal</td><td style="color:#fff;font-size:13px;padding-bottom:6px;text-align:right;">$${subtotal.toLocaleString('es-MX')} MXN</td></tr>
      ${descuentoHecacoins > 0 ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:6px;">Descuento Hecacoins</td><td style="color:#4ade80;font-size:13px;padding-bottom:6px;text-align:right;">-$${descuentoHecacoins.toLocaleString('es-MX')} MXN</td></tr>` : ''}
      ${costoEnvio > 0 ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:6px;">Envío${proveedorEnvio ? ` (${proveedorEnvio})` : ''}</td><td style="color:#fff;font-size:13px;padding-bottom:6px;text-align:right;">$${costoEnvio.toLocaleString('es-MX')} MXN</td></tr>` : ''}
      <tr><td style="color:#fff;font-size:14px;font-weight:900;padding-top:8px;border-top:1px solid #333;">Total</td><td style="color:#f97316;font-size:16px;font-weight:900;text-align:right;padding-top:8px;border-top:1px solid #333;">$${monto.toLocaleString('es-MX')} MXN</td></tr>
    </table>
  ` : ''
  const asunto = esApartado
    ? '🔒 ¡Producto apartado! — Hecatombe Coleccionables'
    : esBodega
    ? '📦 ¡Producto guardado en Bodegatombe! — Hecatombe Coleccionables'
    : '✅ ¡Tu pedido está confirmado! — Hecatombe Coleccionables'

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
            <tr>
              <td style="background:#f97316;padding:24px 40px;">
                <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">⚡ HECATOMBE COLECCIONABLES</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 16px;">
                  ${esApartado ? '🔒 ¡Producto apartado!' : esBodega ? '📦 ¡Guardado en Bodegatombe!' : '¡Pedido confirmado!'}
                </h2>
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                  Hola ${nombreCliente}, ${esApartado
                    ? 'tu anticipo fue recibido. Tu producto está apartado. Te avisaremos cuando llegue para que puedas liquidar el resto.'
                    : esBodega
                    ? 'tu producto está guardado en Bodegatombe. Cuando acumules $1,200 MXN en compras, tu envío será gratis.'
                    : 'tu pago fue procesado exitosamente. En breve nos pondremos en contacto contigo para coordinar el envío.'
                  }
                </p>
                <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                  <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Detalles</td></tr>
                  <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Pedido #${pedidoId}</td></tr>
                  ${subtotal === null ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
                    ${esApartado
                      ? `Anticipo pagado: <span style="color:#f97316;font-weight:900;">$${monto.toLocaleString('es-MX')} MXN</span>`
                      : `Total: <span style="color:#f97316;font-weight:900;">$${monto.toLocaleString('es-MX')} MXN</span>`
                    }
                  </td></tr>` : (esApartado ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Anticipo pagado: <span style="color:#f97316;font-weight:900;">$${monto.toLocaleString('es-MX')} MXN</span></td></tr>` : '')}
                  ${esApartado && montoLiquidacion ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Restante a liquidar: <span style="color:#fff;">$${montoLiquidacion.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                  ${subtotal === null && costoEnvio > 0 ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Incluye envío${proveedorEnvio ? ` (${proveedorEnvio})` : ''}: <span style="color:#fff;">$${costoEnvio.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                  ${!esBodega ? `<tr><td style="color:#aaa;font-size:13px;">Dirección de envío: ${direccion}</td></tr>` : ''}
                </table>
                ${tablaProductos}
                ${tablaResumen}
                ${notaExtra ? `<p style="color:#555;font-size:12px;margin:0 0 16px;">${notaExtra}</p>` : ''}
                <p style="color:#555;font-size:12px;margin:0;">¿Tienes dudas? Escríbenos por WhatsApp al <a href="https://wa.me/524427183787" style="color:#f97316;">524427183787</a></p>
              </td>
            </tr>
            <tr>
              <td style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #222;">
                <p style="color:#444;font-size:11px;margin:0;text-align:center;">© 2026 Hecatombe Coleccionables · Querétaro, México · <a href="https://hecatombe.com.mx" style="color:#f97316;text-decoration:none;">hecatombe.com.mx</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  return { asunto, html }
}

// Copia oculta a jpablobeltran7299@gmail.com en TODO correo que reciba un
// cliente, para poder auditar exactamente qué está recibiendo la gente.
export const BCC_MONITOREO_CLIENTES = ['jpablobeltran7299@gmail.com']

// Correo de "tu pedido ya salió" — se manda cuando el admin genera la guía
// en /admin/pedidos. Antes este paso no avisaba nada al cliente: la guía se
// generaba de verdad con la paquetería pero el cliente nunca se enteraba.
export function plantillaEnvioGenerado({
  nombreCliente,
  pedidoId,
  proveedor,
  trackingNumber,
  trackingUrl,
  direccion = 'No proporcionada',
  items = [],
}) {
  const asunto = `🚚 ¡Tu pedido #${pedidoId} ya va en camino! — Hecatombe Coleccionables`

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
            <tr>
              <td style="background:#f97316;padding:24px 40px;">
                <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">⚡ HECATOMBE COLECCIONABLES</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 16px;">🚚 ¡Tu pedido ya va en camino!</h2>
                <p style="color:#fff;font-size:19px;font-weight:900;margin:0 0 10px;">¡Buen día, ${nombreCliente}! 👋</p>
                <p style="color:#f97316;font-size:15px;font-weight:700;font-style:italic;line-height:1.6;margin:0 0 24px;">Ojalá al llegar nos regales una historia ✨<br>¡Saludos! 🌟</p>
                <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                  <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Rastreo</td></tr>
                  <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Paquetería: <span style="color:#fff;">${proveedor}</span></td></tr>
                  <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Número de guía: <span style="color:#fff;">${trackingNumber}</span></td></tr>
                  <tr><td style="color:#aaa;font-size:13px;">Dirección: ${direccion}</td></tr>
                </table>
                ${trackingUrl ? `<a href="${trackingUrl}" style="display:inline-block;background:#f97316;color:#000;font-weight:900;text-transform:uppercase;font-size:13px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Rastrear mi pedido →</a>` : ''}
                ${tablaProductosHtml(items)}
                <p style="color:#555;font-size:12px;margin:0;">¿Tienes dudas? Escríbenos por WhatsApp al <a href="https://wa.me/524427183787" style="color:#f97316;">524427183787</a></p>
              </td>
            </tr>
            <tr>
              <td style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #222;">
                <p style="color:#444;font-size:11px;margin:0;text-align:center;">© 2026 Hecatombe Coleccionables · Querétaro, México · <a href="https://hecatombe.com.mx" style="color:#f97316;text-decoration:none;">hecatombe.com.mx</a></p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `

  return { asunto, html }
}
