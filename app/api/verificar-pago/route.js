import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getSanityWriteClient } from '@/lib/sanityAdmin'
import { procesarPagoAprobado } from '@/lib/procesarPago'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Red de seguridad para cuando el webhook de MercadoPago no llega: el
// cliente regresa del pago a /carrito con el payment_id en la URL, esa
// página llama aquí para forzar la verificación/creación del pedido sin
// esperar a que el webhook (si es que llega) lo haga. Idempotente — llamar
// dos veces con el mismo payment_id nunca duplica nada (ver
// lib/procesarPago.js, índice único en pedidos.mp_payment_id).
async function verificar(paymentId) {
  if (!paymentId) {
    return NextResponse.json({ status: 'payment_id requerido' }, { status: 400 })
  }

  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const sanityClient = getSanityWriteClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  const pago = await new Payment(mpClient).get({ id: paymentId }).catch((e) => {
    console.error(`[verificar-pago] no se pudo obtener el pago ${paymentId}:`, e.message)
    return null
  })

  if (!pago) {
    return NextResponse.json({ status: 'no_encontrado' }, { status: 200 })
  }

  if (pago.status !== 'approved') {
    return NextResponse.json({ status: 'no_aprobado', estadoMp: pago.status }, { status: 200 })
  }

  const resultado = await procesarPagoAprobado(pago, { supabase, sanityClient, resend })
  console.log(`[verificar-pago] payment ${paymentId}: ${resultado.status} — pedido #${resultado.pedidoId ?? 'n/a'}`)
  return NextResponse.json(resultado, { status: 200 })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  return verificar(body.payment_id)
}

export async function GET(request) {
  const paymentId = new URL(request.url).searchParams.get('payment_id')
  return verificar(paymentId)
}
