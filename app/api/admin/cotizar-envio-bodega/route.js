import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { extraerLineas } from '@/lib/pedidos'
import { cotizarEnvio } from '@/lib/soloenvios'
import { armarParcels, formatearTarifas } from '@/lib/paquetes'

export const maxDuration = 60

// Cotiza (sin persistir nada todavía) el envío combinado de un grupo de
// pedidos de Bodegatombe ya "solicitados" — para que Hecatombe elija la
// paquetería que más le convenga antes de generar la guía.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { user_id } = await request.json()
    if (!user_id) {
      return NextResponse.json({ error: 'Falta user_id.' }, { status: 400 })
    }

    const { data: pedidosGrupo } = await supabase
      .from('pedidos')
      .select('id, items, producto_id, direccion_snapshot')
      .eq('user_id', user_id)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'solicitado')

    const pedidos = pedidosGrupo || []
    if (pedidos.length === 0) {
      return NextResponse.json({ error: 'Este cliente no tiene una solicitud de envío pendiente.' }, { status: 400 })
    }

    const direccion = pedidos.find(p => p.direccion_snapshot)?.direccion_snapshot
    if (!direccion) {
      return NextResponse.json({ error: 'No se encontró la dirección de esta solicitud.' }, { status: 400 })
    }

    const items = pedidos.flatMap(p => extraerLineas(p))
    const ids = items.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const parcels = armarParcels(items, productosMap)
    const { quotationId, tarifas } = await cotizarEnvio({ direccion, parcels })

    return NextResponse.json({ quotationId, tarifas: formatearTarifas(tarifas) })
  } catch (error) {
    console.error('Error cotizando envío de bodega (admin):', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
