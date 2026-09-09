import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getProducto } from '@/lib/sanity'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { productoId } = await request.json()
    if (!productoId) return NextResponse.json({ error: 'productoId requerido' }, { status: 400 })

    const producto = await getProducto(productoId)
    if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })

    const { data: pedidos, error } = await supabase
      .from('pedidos')
      .select('id, user_id, monto_liquidacion')
      .eq('producto_id', productoId)
      .eq('tipo_pedido', 'apartado')
      .eq('estado', 'apartado')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!pedidos || pedidos.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, mensaje: 'No hay apartados pendientes de este producto.' })
    }

    let enviados = 0
    const errores = []

    for (const pedido of pedidos) {
      try {
        const { data: { user } } = await supabase.auth.admin.getUserById(pedido.user_id)
        const email = user?.email
        if (!email) continue

        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre')
          .eq('user_id', pedido.user_id)
          .single()

        await resend.emails.send({
          from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
          to: email,
          subject: `📦 ¡Tu preventa llegó! — ${producto.nombre}`,
          html: `
            <!DOCTYPE html>
            <html>
            <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
                    <tr>
                      <td style="background:#f97316;padding:24px 40px;">
                        <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">📦 ¡Tu preventa llegó!</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:40px;">
                        <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                          Hola ${perfil?.nombre || ''}, tu producto <strong style="color:#fff;">${producto.nombre}</strong> ya llegó a nuestra bodega. Ya puedes liquidar el pago pendiente para que te lo enviemos.
                        </p>
                        ${pedido.monto_liquidacion ? `
                        <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                          <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Pendiente de liquidar</td></tr>
                          <tr><td style="color:#fff;font-size:22px;font-weight:900;">$${pedido.monto_liquidacion.toLocaleString('es-MX')} MXN</td></tr>
                        </table>` : ''}
                        <a href="https://hecatombe.com.mx/cuenta"
                          style="display:block;text-align:center;background:#f97316;color:#000;font-weight:900;text-transform:uppercase;padding:14px;border-radius:10px;text-decoration:none;margin-bottom:16px;">
                          Liquidar ahora
                        </a>
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
        enviados++
      } catch (e) {
        errores.push(pedido.id)
      }
    }

    return NextResponse.json({ ok: true, enviados, total: pedidos.length, errores })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
