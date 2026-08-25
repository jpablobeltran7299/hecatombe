import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createSanityClient } from 'next-sanity'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const sanityClient = createSanityClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    useCdn: false,
  })

  const resend = new Resend(process.env.RESEND_API_KEY)

  const limite = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: itemsAbandonados, error: carritoError } = await supabase
    .from('carrito')
    .select('user_id, producto_id, cantidad, updated_at')
    .lt('updated_at', limite)

  if (carritoError) {
    return NextResponse.json({ error: carritoError.message }, { status: 500 })
  }

  if (!itemsAbandonados || itemsAbandonados.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  const porUsuario = {}
  for (const item of itemsAbandonados) {
    if (!porUsuario[item.user_id]) porUsuario[item.user_id] = []
    porUsuario[item.user_id].push(item)
  }

  const userIds = Object.keys(porUsuario)

  const { data: yaRecordados } = await supabase
    .from('carrito_recordatorios')
    .select('user_id')
    .in('user_id', userIds)

  const yaRecordadosSet = new Set((yaRecordados || []).map(r => r.user_id))

  const { data: pedidosRecientes } = await supabase
    .from('pedidos')
    .select('user_id')
    .in('user_id', userIds)
    .gt('created_at', limite)

  const yaCompraronSet = new Set((pedidosRecientes || []).map(p => p.user_id))

  let enviados = 0

  for (const userId of userIds) {
    if (yaRecordadosSet.has(userId) || yaCompraronSet.has(userId)) continue

    const productosValidos = []
    for (const item of porUsuario[userId]) {
      const producto = await sanityClient.fetch(
        `*[_type == "producto" && _id == $id && activo != false][0]{ _id, nombre, precio }`,
        { id: item.producto_id }
      )
      if (producto) {
        productosValidos.push({ ...producto, cantidad: item.cantidad })
      }
    }

    if (productosValidos.length === 0) continue

    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userEmail = user?.email
    if (!userEmail) continue

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, apellido')
      .eq('user_id', userId)
      .single()

    const nombreCliente = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : userEmail

    const filasHtml = productosValidos.map(p => `
      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
        ${p.nombre}${p.cantidad > 1 ? ` x${p.cantidad}` : ''} — <span style="color:#f97316;font-weight:900;">$${(p.precio * p.cantidad).toLocaleString('es-MX')} MXN</span>
      </td></tr>
    `).join('')

    try {
      await resend.emails.send({
        from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
        to: userEmail,
        subject: '🛒 Dejaste algo en tu carrito — Hecatombe Coleccionables',
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
                      <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 16px;">🛒 ¡Olvidaste algo!</h2>
                      <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 24px;">
                        Hola ${nombreCliente}, todavía tienes estos productos esperando en tu carrito. ¡No dejes que se agoten!
                      </p>
                      <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                        <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Tu carrito</td></tr>
                        ${filasHtml}
                      </table>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                        <tr><td align="center">
                          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/carrito" style="display:inline-block;background:#f97316;color:#000;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-decoration:none;padding:16px 32px;border-radius:10px;">
                            Completar mi compra
                          </a>
                        </td></tr>
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

      await supabase.from('carrito_recordatorios').insert({ user_id: userId })
      enviados++
    } catch (err) {
      console.error(`Error enviando recordatorio a ${userId}:`, err)
    }
  }

  return NextResponse.json({ ok: true, enviados })
}
