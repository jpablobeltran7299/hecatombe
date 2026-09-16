import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { cotizarEnvio } from '@/lib/soloenvios'
import { armarParcels, formatearTarifas } from '@/lib/paquetes'

export const maxDuration = 60

// Cotiza un pedido individual que no guardó una cotización al pagar —
// pasa con los pedidos de envío gratis (superaron $1,200), que nunca
// eligieron paquetería en el checkout.
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
      .select('id, items, producto_id, tipo_pedido, direccion_snapshot')
      .eq('id', pedido_id)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }
    if (!pedido.direccion_snapshot) {
      return NextResponse.json({ error: 'Este pedido no tiene una dirección de envío guardada.' }, { status: 400 })
    }

    const items = pedido.tipo_pedido === 'normal'
      ? (pedido.items || [])
      : (pedido.producto_id ? [{ producto_id: pedido.producto_id, cantidad: 1 }] : [])

    const ids = items.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const parcels = armarParcels(items, productosMap)
    const { quotationId, tarifas } = await cotizarEnvio({ direccion: pedido.direccion_snapshot, parcels })

    return NextResponse.json({ quotationId, tarifas: formatearTarifas(tarifas) })
  } catch (error) {
    console.error('Error cotizando envío de pedido (admin):', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
