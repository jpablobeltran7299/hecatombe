import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { obtenerCotizacion } from '@/lib/soloenvios'
import { BODEGA_THRESHOLD_MXN } from '@/lib/constants'
import { alertarAdmin } from '@/lib/alertas'
import { getAuthUser } from '@/lib/auth'

export const maxDuration = 60

export async function POST(request) {
  try {
    // Igual que en /api/checkout: nunca confiar en el userId/userEmail del
    // body — se exige sesión real y se usa el usuario que esa sesión certifica.
    const auth = await getAuthUser(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.user.id
    const userEmail = auth.user.email

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { direccionId, quotation_id, rate_id } = await request.json()
    if (!direccionId) {
      return NextResponse.json({ error: 'Faltan datos para solicitar el envío.' }, { status: 400 })
    }

    const { data: direccion } = await supabase
      .from('direcciones')
      .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
      .eq('id', direccionId)
      .eq('user_id', userId)
      .single()

    if (!direccion) {
      return NextResponse.json({ error: 'La dirección seleccionada no es válida.' }, { status: 400 })
    }

    // Nunca se confía en lo que mande el cliente sobre qué pedidos incluir
    // ni cuánto lleva acumulado — se vuelve a calcular aquí.
    const { data: pedidosBodega } = await supabase
      .from('pedidos')
      .select('id, total')
      .eq('user_id', userId)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'guardando')

    const pedidos = pedidosBodega || []
    if (pedidos.length === 0) {
      return NextResponse.json({ error: 'No tienes productos guardados en Bodegatombe.' }, { status: 400 })
    }

    const pedidoIds = pedidos.map(p => p.id)
    const totalAcumulado = pedidos.reduce((acc, p) => acc + (p.total || 0), 0)
    const resend = new Resend(process.env.RESEND_API_KEY)

    if (totalAcumulado >= BODEGA_THRESHOLD_MXN) {
      // Gratis: se marca como solicitado y Hecatombe cotiza/elige paquetería
      // después desde /admin/bodega — el cliente no elige aquí a propósito.
      await supabase.from('pedidos')
        .update({ bodega_estado: 'solicitado', bodega_tipo_solicitud: 'gratis', direccion_snapshot: direccion })
        .in('id', pedidoIds)
        .eq('bodega_estado', 'guardando')

      // Este aviso usa alertarAdmin (no el cliente `resend` local) a propósito:
      // antes, si este correo fallaba, solo quedaba un console.error — el
      // pedido se marcaba "solicitado" y nadie en Hecatombe se enteraba de
      // que había que entrar a /admin/bodega a cotizar. alertarAdmin manda
      // el correo por fetch directo a la API de Resend, sin depender de que
      // el cliente `resend` de arriba se haya construido bien.
      await alertarAdmin(
        `📦 Nueva solicitud de envío gratis de Bodegatombe — $${totalAcumulado.toLocaleString('es-MX')} MXN`,
        `Cliente: ${userEmail}\nPedidos incluidos: ${pedidoIds.join(', ')}\nTotal acumulado: $${totalAcumulado.toLocaleString('es-MX')} MXN\nDirección: ${direccion.calle}, ${direccion.colonia}, ${direccion.ciudad}, ${direccion.estado} CP ${direccion.cp}\n\nEntra a /admin/bodega para cotizar y elegir la paquetería.`
      )

      return NextResponse.json({ ok: true, gratis: true })
    }

    // Aún no llega a $1,200 — el cliente decide pagar la tarifa real para
    // adelantar su envío. Verificamos la tarifa elegida antes de cobrar.
    if (!quotation_id || !rate_id) {
      return NextResponse.json({ error: 'Elige una paquetería para adelantar tu envío.' }, { status: 400 })
    }

    const { tarifas } = await obtenerCotizacion(quotation_id)
    const tarifaElegida = tarifas.find(t => t.id === rate_id)
    if (!tarifaElegida) {
      return NextResponse.json({ error: 'La tarifa elegida ya no es válida. Vuelve a cotizar.' }, { status: 400 })
    }
    const costoEnvio = parseFloat(tarifaElegida.total)

    // external_reference muy largo hace que Mercado Pago rechace el pago en
    // checkout sin dar motivo (confirmado en producción) — el detalle
    // completo se guarda en Supabase y a MP solo se le manda el id.
    const { data: checkoutPendiente, error: errorCheckoutPendiente } = await supabase
      .from('checkout_pendientes')
      .insert({
        payload: {
          tipo_pedido: 'envio_bodega',
          userId,
          direccion_id: direccionId,
          pedido_ids: pedidoIds,
          quotation_id,
          rate_id,
          costo_envio: costoEnvio,
          proveedor: tarifaElegida.provider_display_name,
          servicio: tarifaElegida.provider_service_name,
          dias: tarifaElegida.days,
        }
      })
      .select('id')
      .single()

    if (errorCheckoutPendiente) {
      throw new Error(`Error al guardar el checkout pendiente: ${errorCheckoutPendiente.message}`)
    }

    const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
    const preference = new Preference(client)
    const response = await preference.create({
      body: {
        items: [{
          id: 'envio-bodega-anticipado',
          title: 'Envío anticipado — Bodegatombe',
          quantity: 1,
          unit_price: costoEnvio,
          currency_id: 'MXN',
        }],
        payer: { email: userEmail },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/cuenta?tab=bodega&estado=exitoso`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/cuenta?tab=bodega&estado=fallido`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/cuenta?tab=bodega&estado=pendiente`,
        },
        auto_return: 'approved',
        external_reference: String(checkoutPendiente.id),
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`,
      },
    })

    return NextResponse.json({ init_point: response.init_point })
  } catch (error) {
    console.error('Error solicitando envío de bodega:', error)
    await alertarAdmin(
      '🚨 Error en /api/solicitar-envio-bodega — un cliente no pudo adelantar su envío',
      `Error: ${error.message}\n\nRevisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
