import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { extraerLineas } from '@/lib/pedidos'
import { crearEnvio, obtenerCotizacion } from '@/lib/soloenvios'
import { armarParcels } from '@/lib/paquetes'

// Genera la guía real combinada para todos los pedidos "solicitados" de
// bodega de un cliente. Si ya traían una tarifa elegida (envío pagado por
// el cliente para adelantarlo), se usa esa. Si no (envío gratis), hay que
// mandar quotation_id/rate_id — la que Hecatombe eligió en el paso anterior.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { user_id, quotation_id, rate_id } = await request.json()
    if (!user_id) {
      return NextResponse.json({ error: 'Falta user_id.' }, { status: 400 })
    }

    const { data: pedidosGrupo } = await supabase
      .from('pedidos')
      .select('id, items, producto_id, direccion_snapshot, envio_cotizacion, guia')
      .eq('user_id', user_id)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'solicitado')

    const pedidos = pedidosGrupo || []
    if (pedidos.length === 0) {
      return NextResponse.json({ error: 'Este cliente no tiene una solicitud de envío pendiente.' }, { status: 400 })
    }
    if (pedidos.some(p => p.guia?.trackingNumber)) {
      return NextResponse.json({ error: 'Este envío ya tiene una guía generada.' }, { status: 400 })
    }

    const direccion = pedidos.find(p => p.direccion_snapshot)?.direccion_snapshot
    if (!direccion) {
      return NextResponse.json({ error: 'No se encontró la dirección de esta solicitud.' }, { status: 400 })
    }

    // Ya trae tarifa elegida (envío pagado por el cliente) o se manda una
    // recién elegida por Hecatombe (envío gratis).
    const cotizacionExistente = pedidos.find(p => p.envio_cotizacion?.rate_id)?.envio_cotizacion
    const rateIdFinal = rate_id || cotizacionExistente?.rate_id
    const quotationIdFinal = quotation_id || cotizacionExistente?.quotation_id

    if (!rateIdFinal || !quotationIdFinal) {
      return NextResponse.json({ error: 'Falta elegir una paquetería para este envío.' }, { status: 400 })
    }

    const { tarifas } = await obtenerCotizacion(quotationIdFinal)
    const tarifaElegida = tarifas.find(t => t.id === rateIdFinal)
    if (!tarifaElegida) {
      return NextResponse.json({ error: 'La tarifa elegida ya no es válida. Vuelve a cotizar.' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.admin.getUserById(user_id)
    if (!user?.email) {
      return NextResponse.json({ error: 'No se encontró el correo del cliente.' }, { status: 400 })
    }

    const items = pedidos.flatMap(p => extraerLineas(p))
    const ids = items.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })
    const parcels = armarParcels(items, productosMap)

    const envio = await crearEnvio({
      rateId: rateIdFinal,
      direccionDestino: { ...direccion, email: user.email },
      parcels,
    })

    if (!envio.trackingNumber) {
      return NextResponse.json({
        error: `No se pudo generar la guía (estado: ${envio.workflowStatus}). ${envio.errorDetail?.error_message || ''}`,
      }, { status: 502 })
    }

    const guia = {
      shipment_id: envio.shipmentId,
      trackingNumber: envio.trackingNumber,
      trackingUrl: envio.trackingUrl,
      labelUrl: envio.labelUrl,
      proveedor: tarifaElegida.provider_display_name,
      generado_en: new Date().toISOString(),
    }
    const envioCotizacion = {
      quotation_id: quotationIdFinal,
      rate_id: rateIdFinal,
      proveedor: tarifaElegida.provider_display_name,
      servicio: tarifaElegida.provider_service_name,
      total: parseFloat(tarifaElegida.total),
      dias: tarifaElegida.days,
    }

    await supabase.from('pedidos')
      .update({ guia, envio_cotizacion: envioCotizacion, bodega_estado: 'enviado' })
      .in('id', pedidos.map(p => p.id))

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error generando guía de envío de bodega:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
