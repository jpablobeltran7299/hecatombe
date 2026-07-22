import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
export const dynamic = 'force-dynamic'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const body = await request.json()

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const payment = new Payment(client)
    const pago = await payment.get({ id: paymentId })

    if (pago.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    const userId = pago.external_reference

    // Obtener datos del usuario
    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userEmail = user?.email || ''

    // Obtener carrito
    const { data: carritoItems } = await supabase
      .from('carrito')
      .select('producto_id, cantidad')
      .eq('user_id', userId)

    // Obtener perfil para dirección
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
      .eq('user_id', userId)
      .single()

    const nombreCliente = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : userEmail
    const direccion = perfil
      ? `${perfil.calle}, ${perfil.colonia}, ${perfil.ciudad}, ${perfil.estado} CP ${perfil.cp}${perfil.referencias ? ` — ${perfil.referencias}` : ''}`
      : 'No proporcionada'

    // Guardar pedido
    const { data: pedido } = await supabase.from('pedidos').insert({
      user_id: userId,
      total: pago.transaction_amount,
      estado: 'pagado',
      items: carritoItems || [],
      mp_payment_id: String(paymentId),
    }).select().single()

    // Vaciar carrito
    await supabase.from('carrito').delete().eq('user_id', userId)

    // Email al cliente
    await resend.emails.send({
      from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
      to: userEmail,
      subject: '✅ ¡Tu pedido está confirmado! — Hecatombe Coleccionables',
      html: `
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
                    <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 16px;">¡Pedido confirmado!</h2>
                    <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Hola ${nombreCliente}, tu pago fue procesado exitosamente. En breve nos pondremos en contacto contigo para coordinar el envío.
                    </p>
                    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                      <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Detalles del pedido</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Pedido #${pedido?.id || paymentId}</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Total: <span style="color:#f97316;font-weight:900;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span></td></tr>
                      <tr><td style="color:#aaa;font-size:13px;">Dirección de envío: ${direccion}</td></tr>
                    </table>
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
    })

    // Email a Diego
    await resend.emails.send({
      from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
      to: 'hecatombe.9194@gmail.com',
      subject: `🛍️ Nuevo pedido #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
                <tr>
                  <td style="background:#f97316;padding:24px 40px;">
                    <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">🛍️ NUEVO PEDIDO</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 24px;">Pedido #${pedido?.id}</h2>
                    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                      <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Cliente</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Nombre: <span style="color:#fff;">${nombreCliente}</span></td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Email: <span style="color:#fff;">${userEmail}</span></td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Teléfono: <span style="color:#fff;">${perfil?.telefono || 'No proporcionado'}</span></td></tr>
                      <tr><td style="color:#aaa;font-size:13px;">Dirección: <span style="color:#fff;">${direccion}</span></td></tr>
                    </table>
                    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;" cellpadding="0" cellspacing="0">
                      <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Pago</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Total: <span style="color:#f97316;font-weight:900;font-size:18px;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span></td></tr>
                      <tr><td style="color:#aaa;font-size:13px;">ID Mercado Pago: <span style="color:#fff;">${paymentId}</span></td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #222;">
                    <p style="color:#444;font-size:11px;margin:0;text-align:center;">Sistema automático Hecatombe Coleccionables</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}