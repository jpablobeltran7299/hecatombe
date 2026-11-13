import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getSanityWriteClient } from '@/lib/sanityAdmin'
import { procesarPagoAprobado } from '@/lib/procesarPago'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Segunda red de seguridad (además de la verificación al volver del pago en
// /carrito): reconcilia checkouts que nunca llegaron a procesarse — ni por
// webhook ni porque el cliente regresó al sitio (cerró la pestaña, el banco
// no lo redirigió de vuelta, etc). La llama un workflow de GitHub Actions
// cada ~10-15 min (el plan de Vercel es Hobby — sus crons solo corren 1 vez
// al día, insuficiente para esto).
async function buscarPagoPorExternalReference(externalReference) {
  const res = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}`,
    { headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data?.results?.[0] ?? null
}

export async function GET(request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const sanityClient = getSanityWriteClient()
  const resend = new Resend(process.env.RESEND_API_KEY)

  const ahora = Date.now()
  // Menos de 10 min: se deja al webhook normal y a la verificación de
  // retorno, que deberían ganarle. Más de 48h: se asume irrelevante (mismo
  // criterio que el cron de carrito-abandonado).
  const desde = new Date(ahora - 48 * 60 * 60 * 1000).toISOString()
  const hasta = new Date(ahora - 10 * 60 * 1000).toISOString()

  const { data: pendientes, error } = await supabase
    .from('checkout_pendientes')
    .select('id, created_at')
    .gte('created_at', desde)
    .lte('created_at', hasta)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const resultados = []
  for (const fila of pendientes || []) {
    try {
      const pago = await buscarPagoPorExternalReference(fila.id)
      if (pago && pago.status === 'approved') {
        const r = await procesarPagoAprobado(pago, { supabase, sanityClient, resend })
        resultados.push({ checkoutPendienteId: fila.id, paymentId: pago.id, ...r })
      }
    } catch (e) {
      console.error(`[pagos-pendientes] error reconciliando checkout_pendiente ${fila.id}:`, e)
      resultados.push({ checkoutPendienteId: fila.id, status: 'error', mensaje: e.message })
    }
  }

  return NextResponse.json({ ok: true, procesados: resultados.length, detalle: resultados })
}
