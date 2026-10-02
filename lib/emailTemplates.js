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
}) {
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
                  <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
                    ${esApartado
                      ? `Anticipo pagado: <span style="color:#f97316;font-weight:900;">$${monto.toLocaleString('es-MX')} MXN</span>`
                      : `Total: <span style="color:#f97316;font-weight:900;">$${monto.toLocaleString('es-MX')} MXN</span>`
                    }
                  </td></tr>
                  ${esApartado && montoLiquidacion ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Restante a liquidar: <span style="color:#fff;">$${montoLiquidacion.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                  ${costoEnvio > 0 ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Incluye envío${proveedorEnvio ? ` (${proveedorEnvio})` : ''}: <span style="color:#fff;">$${costoEnvio.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                  ${!esBodega ? `<tr><td style="color:#aaa;font-size:13px;">Dirección de envío: ${direccion}</td></tr>` : ''}
                </table>
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
