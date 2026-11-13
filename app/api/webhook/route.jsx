import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import crypto from 'crypto'
import { getSanityWriteClient } from '@/lib/sanityAdmin'
import { alertarAdmin } from '@/lib/alertas'
import { procesarPagoAprobado } from '@/lib/procesarPago'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

export async function POST(request) {
  try {
    const mpClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const sanityClient = getSanityWriteClient()

    const resend = new Resend(process.env.RESEND_API_KEY)

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
                '⚠️ Webhook recibió una notificación no reconocida',
        `No se reconoció el formato de esta notificación de MercadoPago, así que se ignoró.\n\nbody.type: ${body.type}\ntopic (query): ${topicQuery}\nurl completa: ${request.url}\nbody recibido: ${JSON.stringify(body)}\n\nSi esto correspondía a un pago real, hay que revisarlo manualmente en el dashboard de MercadoPago.`
      )
      return NextResponse.json({ ok: true })
    }

    if (!paymentId) {
      await alertarAdmin(
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
                `⚠️ Firma inválida en webhook — payment ${paymentId}`,
        `Se rechazó una notificación para el payment ${paymentId} porque la firma no coincidió. Si este pago es real, revisarlo manualmente en MercadoPago.`
      )
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
    }

    const { data: pedidoExistente } = await supabase
      .from('pedidos')
      .select('id, user_id, estado')
      .eq('mp_payment_id', String(paymentId))
      .limit(1)

    const payment = new Payment(mpClient)
    const pago = await payment.get({ id: paymentId })

    // Si ya existe un pedido para este pago, antes simplemente se respondía
    // ok:true sin volver a mirar el estado — un reembolso o contracargo que
    // MercadoPago reenvía para un pago ya procesado se ignoraba por
    // completo: el pedido se quedaba "pagado" para siempre, sin revertir
    // Hecacoins, y sin que nadie se enterara.
    if (pedidoExistente && pedidoExistente.length > 0) {
      const pedido = pedidoExistente[0]
      const esReversión = ['refunded', 'charged_back', 'cancelled'].includes(pago.status)

      if (esReversión && pedido.estado !== 'cancelado') {
        try {
          const { data: movimientos } = await supabase
            .from('hecacoins_movimientos')
            .select('user_id, tipo, monto')
            .eq('pedido_id', pedido.id)

          for (const m of movimientos || []) {
            if (m.tipo === 'ganado') {
              await ajustarHecacoins(supabase, m.user_id, { saldoDelta: -m.monto, ganadoDelta: -m.monto })
            } else if (m.tipo === 'canjeado') {
              await ajustarHecacoins(supabase, m.user_id, { saldoDelta: m.monto, canjeadoDelta: -m.monto })
            }
          }

          await supabase.from('pedidos').update({ estado: 'cancelado' }).eq('id', pedido.id)

          await alertarAdmin(
            `🔙 Pago ${pago.status === 'refunded' ? 'reembolsado' : pago.status === 'charged_back' ? 'con contracargo' : 'cancelado'} — pedido #${pedido.id}`,
            `Payment ID: ${paymentId}\nPedido #${pedido.id}\nEstado MP: ${pago.status}\nMonto: $${pago.transaction_amount}\n\nSe revirtieron las Hecacoins asociadas (${(movimientos || []).length} movimiento(s)) y el pedido se marcó "cancelado". REVISAR MANUALMENTE: reponer stock en Sanity si ya se había descontado, y cancelar/detener el envío si ya se generó guía.`
          )
        } catch (e) {
          console.error(`Error revirtiendo pedido #${pedido.id} tras ${pago.status}:`, e)
          await alertarAdmin(
            `🚨 Pago ${pago.status} para pedido #${pedido.id} — la reversión automática falló`,
            `Payment ID: ${paymentId}\nError: ${e.message}\n\nRevisar y revertir manualmente: Hecacoins, estado del pedido, stock y envío.`
          )
        }
      }

      return NextResponse.json({ ok: true })
    }

    if (pago.status !== 'approved') {
      console.log(`Pago ${paymentId} en estado "${pago.status}" — aún no aprobado`)
      if (pago.status === 'pending' || pago.status === 'in_process') {
        await alertarAdmin(
                    `⏳ Pago pendiente #${paymentId} — revisar`,
          `Payment ID: ${paymentId}\nEstado: ${pago.status}\nMonto: $${pago.transaction_amount}\nExternal reference: ${pago.external_reference}\n\nSi este pago se aprueba después, MercadoPago debería reenviar el webhook. Si no llega el pedido en unas horas, revisar manualmente en el dashboard de MercadoPago.`
        )
      }
      return NextResponse.json({ ok: true })
    }

    // El procesamiento real (resolver external_reference/checkout_pendientes,
    // crear el pedido, descontar stock, ajustar Hecacoins y mandar correos)
    // vive en lib/procesarPago.js — así lo reusan también las redes de
    // seguridad para cuando este webhook no llega (verificación al volver
    // del pago, cron de reconciliación), sin duplicar la lógica de negocio.
    const resultado = await procesarPagoAprobado(pago, { supabase, sanityClient, resend })
    console.log(`[webhook] payment ${paymentId}: ${resultado.status} — pedido #${resultado.pedidoId ?? 'n/a'}`)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    await alertarAdmin(
            '🚨 Error en webhook de pagos — venta posiblemente no procesada',
      `Error: ${error.message}\n\nBody recibido: revisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}