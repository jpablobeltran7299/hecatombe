import { MercadoPagoConfig, Payment } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const body = await request.json()

    // Solo procesar notificaciones de pago
    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const paymentId = body.data?.id
    if (!paymentId) return NextResponse.json({ ok: true })

    // Obtener detalles del pago
    const payment = new Payment(client)
    const pago = await payment.get({ id: paymentId })

    if (pago.status !== 'approved') {
      return NextResponse.json({ ok: true })
    }

    const userId = pago.external_reference

    // Obtener carrito del usuario en Supabase
    const { data: carritoItems } = await supabase
      .from('carrito')
      .select('producto_id, cantidad')
      .eq('user_id', userId)

    // Guardar pedido en Supabase
    await supabase.from('pedidos').insert({
      user_id: userId,
      total: pago.transaction_amount,
      estado: 'pagado',
      items: carritoItems || [],
      mp_payment_id: String(paymentId),
    })

    // Vaciar carrito en Supabase
    await supabase.from('carrito').delete().eq('user_id', userId)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}