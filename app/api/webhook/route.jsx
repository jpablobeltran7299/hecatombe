import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { getSanityWriteClient, descontarStock } from '@/lib/sanityAdmin'
import { ajustarHecacoins } from '@/lib/hecacoins'

export const dynamic = 'force-dynamic'

function validarFirmaMercadoPago(request, dataId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    console.warn('MERCADOPAGO_WEBHOOK_SECRET no configurado — omitiendo validación de firma')
    return true
  }

  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  if (!xSignature || !xRequestId || !dataId) return false

  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => p.trim().split('=').map((s) => s.trim()))
  )
  const { ts, v1 } = partes
  if (!ts || !v1) return false

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  return hash === v1
}

async function alertarAdmin(resend, asunto, detalle) {
  try {
    await resend.emails.send({
      from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
      to: 'hecatombe.9194@gmail.com',
      subject: asunto,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${detalle}</pre>`,
    })
  } catch (e) {
    console.error('No se pudo enviar alerta al admin:', e)
  }
}

export async function POST(request) {
  const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const sanityClient = getSanityWriteClient()

  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const url = new URL(request.url)
    const topicQuery = url.searchParams.get('topic')
    const idQuery = url.searchParams.get('id') || url.searchParams.get('data.id')

    let body = {}
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const esNotificacionDePago = body.type === 'payment' || topicQuery === 'payment'
    const esMerchantOrder = topicQuery === 'merchant_order' || body.topic === 'merchant_order'

    let paymentId = body.data?.id || idQuery

    if (esMerchantOrder && idQuery) {
      // Checkout Pro a veces notifica vía "merchant_order" en vez de "payment" —
      // hay que resolver el/los pagos dentro de esa orden.
      try {
        const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${idQuery}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` },
        })
        const mo = await moRes.json()
        const pagoAprobado = mo.payments?.find(p => p.status === 'approved')
        if (pagoAprobado) {
          paymentId = pagoAprobado.id
        } else {
          console.log('merchant_order sin pagos aprobados todavía:', idQuery)
          return NextResponse.json({ ok: true })
        }
      } catch (e) {
        console.error('Error resolviendo merchant_order:', e)
        await alertarAdmin(
          resend,
          `⚠️ Error resolviendo merchant_order ${idQuery}`,
          `${e.message}\n\nRevisar manualmente en MercadoPago si corresponde a una venta real.`
        )
        return NextResponse.json({ ok: true })
      }
    } else if (!esNotificacionDePago) {
      console.log('Webhook ignorado (no es notificación de pago):', { bodyType: body.type, topicQuery })
      // Se avisa por correo (y no solo por log) porque ya se nos pasó una venta real
      // por confiar en que esta rama era inofensiva — mejor revisar cada vez que pase.
      await alertarAdmin(
        resend,
        '⚠️ Webhook recibió una notificación no reconocida',
        `No se reconoció el formato de esta notificación de MercadoPago, así que se ignoró.\n\nbody.type: ${body.type}\ntopic (query): ${topicQuery}\nurl completa: ${request.url}\nbody recibido: ${JSON.stringify(body)}\n\nSi esto correspondía a un pago real, hay que revisarlo manualmente en el dashboard de MercadoPago.`
      )
      return NextResponse.json({ ok: true })
    }

    if (!paymentId) {
      await alertarAdmin(
        resend,
        '⚠️ Webhook recibió una notificación de pago sin ID',
        `body: ${JSON.stringify(body)}\nurl: ${request.url}`
      )
      return NextResponse.json({ ok: true })
    }

    // La firma de MercadoPago se calcula con el "id" que vino en la URL de la
    // notificación (idQuery) — para merchant_order eso es el id de la orden,
    // NO el paymentId que resolvimos después. Usar el id equivocado aquí
    // rompería la validación en cuanto se configure MERCADOPAGO_WEBHOOK_SECRET.
    const idParaFirma = esMerchantOrder ? idQuery : paymentId
    if (!validarFirmaMercadoPago(request, idParaFirma)) {
      console.error('Firma de webhook inválida para payment', paymentId)
      await alertarAdmin(
        resend,
        `⚠️ Firma inválida en webhook — payment ${paymentId}`,
        `Se rechazó una notificación para el payment ${paymentId} porque la firma no coincidió. Si este pago es real, revisarlo manualmente en MercadoPago.`
      )
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

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
      console.log(`Pago ${paymentId} en estado "${pago.status}" — aún no aprobado`)
      if (pago.status === 'pending' || pago.status === 'in_process') {
        await alertarAdmin(
          resend,
          `⏳ Pago pendiente #${paymentId} — revisar`,
          `Payment ID: ${paymentId}\nEstado: ${pago.status}\nMonto: $${pago.transaction_amount}\nExternal reference: ${pago.external_reference}\n\nSi este pago se aprueba después, MercadoPago debería reenviar el webhook. Si no llega el pedido en unas horas, revisar manualmente en el dashboard de MercadoPago.`
        )
      }
      return NextResponse.json({ ok: true })
    }

    // Parsear external_reference
    let userId, tipo_pedido, destino, producto_id, pedido_id_apartado, anticipo_pagado, monto_liquidacion, hecacoins_canjeadas
    try {
      const ref = JSON.parse(pago.external_reference)
      userId = ref.userId
      tipo_pedido = ref.tipo_pedido || 'normal'
      destino = ref.destino || 'directo'
      producto_id = ref.producto_id
      pedido_id_apartado = ref.pedido_id || null
      anticipo_pagado = ref.anticipo_pagado
      monto_liquidacion = ref.monto_liquidacion
      hecacoins_canjeadas = ref.hecacoins_canjeadas || 0
    } catch {
      userId = pago.external_reference
      tipo_pedido = 'normal'
      destino = 'directo'
    }

    // Si es liquidación, verificar que el apartado original siga pendiente —
    // evita cobrar/procesar dos veces la misma liquidación (ej. doble clic o pago duplicado).
    if (tipo_pedido === 'liquidacion' && pedido_id_apartado) {
      const { data: pedidoApartado } = await supabase
        .from('pedidos')
        .select('id, estado')
        .eq('id', pedido_id_apartado)
        .single()

      if (!pedidoApartado || pedidoApartado.estado !== 'apartado') {
        console.warn(`Liquidación ${paymentId} ignorada: pedido #${pedido_id_apartado} ya no está en estado "apartado" (posible doble pago)`)
        await alertarAdmin(
          resend,
          `⚠️ Posible doble liquidación — pedido #${pedido_id_apartado}`,
          `Payment ID: ${paymentId}\nMonto: $${pago.transaction_amount}\nEl pedido #${pedido_id_apartado} ya no estaba en estado "apartado" cuando llegó esta liquidación. Revisar manualmente si hay que reembolsar.`
        )
        return NextResponse.json({ ok: true })
      }
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

    // Los "items" del pedido deben ser lo que realmente se pagó, no el carrito
    // general del cliente (que es un dato no relacionado para apartado/liquidación
    // y puede tener productos que el cliente ni siquiera compró en esta operación).
    const itemsPedido = tipo_pedido === 'normal'
      ? (carritoItems || [])
      : (producto_id ? [{ producto_id, cantidad: 1 }] : [])

    // Guardar pedido. Si ya existe un índice único en mp_payment_id (ver
    // SQL_pendiente_indice_unico.sql) y dos notificaciones para el mismo pago
    // llegaron casi al mismo tiempo, el segundo insert falla con 23505 en vez
    // de crear un pedido duplicado — lo tratamos como éxito silencioso.
    const { data: pedido, error: errorPedido } = await supabase.from('pedidos').insert({
      user_id: userId,
      total: pago.transaction_amount,
      estado: tipo_pedido === 'apartado' ? 'apartado' : 'pagado',
      items: itemsPedido,
      mp_payment_id: String(paymentId),
      tipo_pedido: tipo_pedido || 'normal',
      destino: destino || 'directo',
      bodega_estado: destino === 'bodega' ? 'guardando' : null,
      producto_id: producto_id || null,
      anticipo_pagado: anticipo_pagado || null,
      monto_liquidacion: monto_liquidacion || null,
    }).select().single()

    if (errorPedido) {
      if (errorPedido.code === '23505') {
        console.log(`Pedido para payment ${paymentId} ya existía (carrera evitada por índice único)`)
        return NextResponse.json({ ok: true })
      }
      throw new Error(`Error al guardar el pedido: ${errorPedido.message}`)
    }

    // Si esta compra liquida un apartado, cerrar el pedido original para
    // que no se pueda volver a liquidar (ver validación arriba).
    if (tipo_pedido === 'liquidacion' && pedido_id_apartado) {
      await supabase.from('pedidos').update({ estado: 'liquidado' }).eq('id', pedido_id_apartado)
    }

    // Vaciar carrito SOLO en compras normales — es el único tipo_pedido que
    // realmente se originó desde ese carrito. Para apartado/liquidación el
    // carrito del cliente es un dato no relacionado y no debe tocarse.
    if (tipo_pedido === 'normal') {
      await supabase.from('carrito').delete().eq('user_id', userId)
    }

    // Descontar stock en Sanity
    if (tipo_pedido === 'normal') {
      const itemsVendidos = carritoItems || []
      for (const item of itemsVendidos) {
        await descontarStock(sanityClient, item.producto_id, item.cantidad || 1)
      }
    } else if (tipo_pedido === 'liquidacion' && producto_id) {
      // La liquidación es una sola unidad del producto apartado originalmente,
      // no lo que haya en el carrito general del cliente.
      await descontarStock(sanityClient, producto_id, 1)
    }

    // Descontar Hecacoins si se canjearon (ajustarHecacoins es seguro ante
    // escrituras concurrentes — ver lib/hecacoins.js)
    if (hecacoins_canjeadas > 0) {
      await ajustarHecacoins(supabase, userId, {
        saldoDelta: -hecacoins_canjeadas,
        canjeadoDelta: hecacoins_canjeadas,
      })

      await supabase.from('hecacoins_movimientos').insert({
        user_id: userId,
        pedido_id: pedido?.id,
        tipo: 'canjeado',
        monto: hecacoins_canjeadas,
        descripcion: `Canje en pedido #${pedido?.id}`,
      })
    }

    // Acumular Hecacoins (3%) — solo en pedidos normales y liquidaciones
    const tiposConHecacoins = ['normal', 'liquidacion']
    if (tiposConHecacoins.includes(tipo_pedido)) {
      const hecacoinsGanadas = Math.floor(pago.transaction_amount * 0.03)

      if (hecacoinsGanadas > 0) {
        const añoActual = new Date().getFullYear()
        const vencimiento = `${añoActual}-12-31`

        await ajustarHecacoins(supabase, userId, {
          saldoDelta: hecacoinsGanadas,
          ganadoDelta: hecacoinsGanadas,
          vencimiento,
        })

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
    await alertarAdmin(
      resend,
      '🚨 Error en webhook de pagos — venta posiblemente no procesada',
      `Error: ${error.message}\n\nBody recibido: revisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}