import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProductosPorIds } from '@/lib/sanity'
import { extraerLineas } from '@/lib/pedidos'
import { cotizarEnvio } from '@/lib/soloenvios'
import { armarParcels, formatearTarifas } from '@/lib/paquetes'
import { BODEGA_THRESHOLD_MXN } from '@/lib/constants'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { userId, direccionId } = await request.json()
    if (!userId || !direccionId) {
      return NextResponse.json({ error: 'Faltan datos para cotizar el envío.' }, { status: 400 })
    }

    const { data: direccion } = await supabase
      .from('direcciones')
      .select('calle, colonia, ciudad, estado, cp')
      .eq('id', direccionId)
      .eq('user_id', userId)
      .single()

    if (!direccion) {
      return NextResponse.json({ error: 'La dirección seleccionada no es válida.' }, { status: 400 })
    }

    const { data: pedidosBodega } = await supabase
      .from('pedidos')
      .select('id, total, items, producto_id')
      .eq('user_id', userId)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'guardando')

    const pedidos = pedidosBodega || []
    if (pedidos.length === 0) {
      return NextResponse.json({ error: 'No tienes productos guardados en Bodegatombe.' }, { status: 400 })
    }

    const pedidoIds = pedidos.map(p => p.id)
    const totalAcumulado = pedidos.reduce((acc, p) => acc + (p.total || 0), 0)
    const items = pedidos.flatMap(p => extraerLineas(p))

    // Ya llegó al monto de envío gratis — no se cotiza para el cliente,
    // Hecatombe elige la paquetería después (ver /admin/bodega).
    if (totalAcumulado >= BODEGA_THRESHOLD_MXN) {
      return NextResponse.json({ envioGratis: true, totalAcumulado, pedidoIds })
    }

    const ids = items.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const parcels = armarParcels(items, productosMap)
    const { quotationId, tarifas } = await cotizarEnvio({ direccion, parcels })

    return NextResponse.json({
      envioGratis: false,
      totalAcumulado,
      falta: BODEGA_THRESHOLD_MXN - totalAcumulado,
      pedidoIds,
      quotationId,
      tarifas: formatearTarifas(tarifas),
    })
  } catch (error) {
    console.error('Error cotizando envío de bodega:', error)
    return NextResponse.json({ error: 'No se pudo cotizar el envío. Intenta de nuevo.' }, { status: 500 })
  }
}
