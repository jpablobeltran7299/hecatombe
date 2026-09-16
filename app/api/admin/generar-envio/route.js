import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { crearEnvio, obtenerCotizacion } from '@/lib/soloenvios'
import { armarParcels } from '@/lib/paquetes'

export const maxDuration = 60

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { pedido_id, quotation_id, rate_id } = await request.json()
    if (!pedido_id) {
      return NextResponse.json({ error: 'Falta pedido_id.' }, { status: 400 })
    }

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, user_id, items, producto_id, tipo_pedido, destino, envio_cotizacion, direccion_snapshot, guia')
      .eq('id', pedido_id)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }
    if (pedido.destino === 'bodega') {
      return NextResponse.json({ error: 'Este pedido va a Bodegatombe, no necesita guía todavía.' }, { status: 400 })
    }
    if (pedido.guia?.trackingNumber) {
      return NextResponse.json({ error: 'Este pedido ya tiene una guía generada.' }, { status: 400 })
    }
    if (!pedido.direccion_snapshot) {
      return NextResponse.json({ error: 'Este pedido no tiene una dirección de envío guardada.' }, { status: 400 })
    }

    // Pedidos con envío gratis (superaron el monto de Bodegatombe) nunca
    // guardan una cotización al pagar — hay que cotizar aquí y que el
    // admin elija, igual que en Bodegatombe.
    const rateIdFinal = rate_id || pedido.envio_cotizacion?.rate_id
    const quotationIdFinal = quotation_id || pedido.envio_cotizacion?.quotation_id
    if (!rateIdFinal || !quotationIdFinal) {
      return NextResponse.json({ error: 'Este pedido no tiene una cotización de envío — cotiza primero para elegir una paquetería.' }, { status: 400 })
    }

    const { tarifas } = await obtenerCotizacion(quotationIdFinal)
    const tarifaElegida = tarifas.find(t => t.id === rateIdFinal)
    if (!tarifaElegida) {
      return NextResponse.json({ error: 'La tarifa elegida ya no es válida. Vuelve a cotizar.' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.admin.getUserById(pedido.user_id)
    if (!user?.email) {
      return NextResponse.json({ error: 'No se encontró el correo del cliente.' }, { status: 400 })
    }

    // Mismos "paquetes" que se usaron para cotizar — un paquete por pieza.
    const itemsPedido = pedido.tipo_pedido === 'normal'
      ? (pedido.items || [])
      : (pedido.producto_id ? [{ producto_id: pedido.producto_id, cantidad: 1 }] : [])

    const ids = itemsPedido.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const parcels = armarParcels(itemsPedido, productosMap)

    const envio = await crearEnvio({
      rateId: rateIdFinal,
      direccionDestino: { ...pedido.direccion_snapshot, email: user.email },
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

    await supabase.from('pedidos').update({ guia, envio_cotizacion: envioCotizacion }).eq('id', pedido_id)

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error generando guía de envío:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
