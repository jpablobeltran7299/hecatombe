import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProductosPorIds } from '@/lib/sanity'
import { cotizarEnvio } from '@/lib/soloenvios'
import { armarParcels, formatearTarifas } from '@/lib/paquetes'

export const maxDuration = 60

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { userId, direccionId, items } = await request.json()

    if (!userId || !direccionId || !items?.length) {
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

    const ids = items.map(i => i.productoId)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    // Un "paquete" por pieza — asume que cada producto se envía en su
    // propia caja. No es perfecto (no combina piezas chicas en una sola
    // caja), pero es una cotización razonable y nunca subestima el costo.
    const parcels = armarParcels(items, productosMap)

    const { quotationId, tarifas } = await cotizarEnvio({ direccion, parcels })

    return NextResponse.json({ quotationId, tarifas: formatearTarifas(tarifas) })
  } catch (error) {
    console.error('Error cotizando envío:', error)
    return NextResponse.json({ error: 'No se pudo cotizar el envío. Intenta de nuevo.' }, { status: 500 })
  }
}
