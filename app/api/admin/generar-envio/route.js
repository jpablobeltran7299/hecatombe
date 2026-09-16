import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { crearEnvio } from '@/lib/soloenvios'
import { armarParcels } from '@/lib/paquetes'

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { pedido_id } = await request.json()
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
    if (!pedido.envio_cotizacion?.rate_id) {
      return NextResponse.json({ error: 'Este pedido no tiene una cotización de envío guardada — no se puede generar la guía automáticamente.' }, { status: 400 })
    }
    if (!pedido.direccion_snapshot) {
      return NextResponse.json({ error: 'Este pedido no tiene una dirección de envío guardada.' }, { status: 400 })
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
      rateId: pedido.envio_cotizacion.rate_id,
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
      proveedor: pedido.envio_cotizacion.proveedor,
      generado_en: new Date().toISOString(),
    }

    await supabase.from('pedidos').update({ guia }).eq('id', pedido_id)

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error generando guía de envío:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
