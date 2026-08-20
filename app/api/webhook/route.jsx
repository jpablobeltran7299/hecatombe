import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createSanityClient } from 'next-sanity'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const sanityClient = createSanityClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const body = await request.json()

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    const { data: pedidoExistente } = await supabase
      .from('pedidos')
      .select('id')
      .eq('mp_payment_id', String(paymentId))
      .limit(1)

    if (pedidoExistente && pedidoExistente.length > 0) {
      return NextResponse.json({ ok: true })
    }

    const payment = new Payment(mpClient)
    const pago = await payment.get({ id: paymentId })

    if (pago.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    // Parsear external_reference
    let userId, tipo_pedido, destino, producto_id, anticipo_pagado, monto_liquidacion, hecacoins_canjeadas
    try {
      const ref = JSON.parse(pago.external_reference)
      userId = ref.userId
      tipo_pedido = ref.tipo_pedido || 'normal'
      destino = ref.destino || 'directo'
      producto_id = ref.producto_id
      anticipo_pagado = ref.anticipo_pagado
      monto_liquidacion = ref.monto_liquidacion
      hecacoins_canjeadas = ref.hecacoins_canjeadas || 0
    } catch {
      userId = pago.external_reference
      tipo_pedido = 'normal'
      destino = 'directo'
    }

    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userEmail = user?.email || ''

    const { data: carritoItems } = await supabase
      .from('carrito')
      .select('producto_id, cantidad')
      .eq('user_id', userId)

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
      estado: tipo_pedido === 'apartado' ? 'apartado' : 'pagado',
      items: carritoItems || [],
      mp_payment_id: String(paymentId),
      tipo_pedido: tipo_pedido || 'normal',
      destino: destino || 'directo',
      bodega_estado: destino === 'bodega' ? 'guardando' : null,
      producto_id: producto_id || null,
      anticipo_pagado: anticipo_pagado || null,
      monto_liquidacion: monto_liquidacion || null,
    }).select().single()

    // Vaciar carrito solo si no es apartado
    if (tipo_pedido !== 'apartado') {
      await supabase.from('carrito').delete().eq('user_id', userId)
    }

    // Descontar stock en Sanity
    if (tipo_pedido === 'normal' || tipo_pedido === 'liquidacion') {
      const itemsVendidos = carritoItems || []
      for (const item of itemsVendidos) {
        const producto = await sanityClient.fetch(
          `*[_type == "producto" && _id == $id][0]{ _id, stock, disponible }`,
          { id: item.producto_id }
        )
        if (producto && producto.stock !== null && producto.stock !== undefined) {
          const nuevoStock = Math.max(0, producto.stock - (item.cantidad || 1))
          await sanityClient
            .patch(producto._id)
            .set({
              stock: nuevoStock,
              disponible: nuevoStock > 0,
              ...(nuevoStock === 0 && { activo: false }),
              ...(nuevoStock <= 3 && nuevoStock > 0 && { ultimasPiezas: true }),
            })
            .commit()
        }
      }
    }

    // Descontar Hecacoins si se canjearon
    if (hecacoins_canjeadas > 0) {
      const { data: saldoActual } = await supabase
        .from('hecacoins')
        .select('id, saldo, total_canjeado')
        .eq('user_id', userId)
        .single()

      if (saldoActual) {
        await supabase
          .from('hecacoins')
          .update({
            saldo: Math.max(0, saldoActual.saldo - hecacoins_canjeadas),
            total_canjeado: saldoActual.total_canjeado + hecacoins_canjeadas,
          })
          .eq('id', saldoActual.id)

        await supabase.from('hecacoins_movimientos').insert({
          user_id: userId,
          pedido_id: pedido?.id,
          tipo: 'canjeado',
          monto: hecacoins_canjeadas,
          descripcion: `Canje en pedido #${pedido?.id}`,
        })
      }
    }

    // Acumular Hecacoins (3%) — solo en pedidos normales y liquidaciones
    const tiposConHecacoins = ['normal', 'liquidacion']
    if (tiposConHecacoins.includes(tipo_pedido)) {
      const hecacoinsGanadas = Math.floor(pago.transaction_amount * 0.03)

      if (hecacoinsGanadas > 0) {
        const añoActual = new Date().getFullYear()
        const vencimiento = `${añoActual}-12-31`

        const { data: saldoActual } = await supabase
          .from('hecacoins')
          .select('id, saldo, total_ganado')
          .eq('user_id', userId)
          .single()

        if (saldoActual) {
          await supabase
            .from('hecacoins')
            .update({
              saldo: saldoActual.saldo + hecacoinsGanadas,
              total_ganado: saldoActual.total_ganado + hecacoinsGanadas,
              vencimiento,
            })
            .eq('id', saldoActual.id)
        } else {
          await supabase
            .from('hecacoins')
            .insert({
              user_id: userId,
              saldo: hecacoinsGanadas,
              total_ganado: hecacoinsGanadas,
              total_canjeado: 0,
              vencimiento,
            })
        }

        await supabase.from('hecacoins_movimientos').insert({
          user_id: userId,
          pedido_id: pedido?.id,
          tipo: 'ganado',
          monto: hecacoinsGanadas,
          descripcion: `Compra pedido #${pedido?.id}`,
        })
      }
    }

    // Emails
    const esApartado = tipo_pedido === 'apartado'
    const esBodega = destino === 'bodega'

    await resend.emails.send({
      from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
      to: userEmail,
      subject: esApartado
        ? '🔒 ¡Producto apartado! — Hecatombe Coleccionables'
        : esBodega
        ? '📦 ¡Producto guardado en Bodegatombe! — Hecatombe Coleccionables'
        : '✅ ¡Tu pedido está confirmado! — Hecatombe Coleccionables',
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
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Pedido #${pedido?.id || paymentId}</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
                        ${esApartado
                          ? `Anticipo pagado: <span style="color:#f97316;font-weight:900;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span>`
                          : `Total: <span style="color:#f97316;font-weight:900;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span>`
                        }
                      </td></tr>
                      ${esApartado && monto_liquidacion ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Restante a liquidar: <span style="color:#fff;">$${monto_liquidacion?.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                      ${!esBodega ? `<tr><td style="color:#aaa;font-size:13px;">Dirección de envío: ${direccion}</td></tr>` : ''}
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

    await resend.emails.send({
      from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
      to: 'hecatombe.9194@gmail.com',
      subject: esApartado
        ? `🔒 Producto apartado #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN anticipo`
        : esBodega
        ? `📦 Nuevo pedido en bodega #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN`
        : `🛍️ Nuevo pedido #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
                <tr>
                  <td style="background:#f97316;padding:24px 40px;">
                    <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">
                      ${esApartado ? '🔒 PRODUCTO APARTADO' : esBodega ? '📦 PEDIDO EN BODEGA' : '🛍️ NUEVO PEDIDO'}
                    </h1>
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
                      ${!esBodega ? `<tr><td style="color:#aaa;font-size:13px;">Dirección: <span style="color:#fff;">${direccion}</span></td></tr>` : ''}
                    </table>
                    <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;" cellpadding="0" cellspacing="0">
                      <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Pago</td></tr>
                      <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
                        ${esApartado ? 'Anticipo' : 'Total'}: <span style="color:#f97316;font-weight:900;font-size:18px;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span>
                      </td></tr>
                      ${esApartado && monto_liquidacion ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Pendiente de liquidar: <span style="color:#fff;">$${monto_liquidacion?.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
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