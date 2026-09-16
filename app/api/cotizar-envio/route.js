import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProductosPorIds } from '@/lib/sanity'
import { cotizarEnvio } from '@/lib/soloenvios'
import { PAQUETE_POR_DEFECTO } from '@/lib/constants'

// Límite de paquetes por cotización — evita abuso (carritos gigantes)
// y respeta los límites razonables de la API.
const MAX_PAQUETES = 20

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
    const parcels = []
    for (const item of items) {
      const producto = productosMap[item.productoId]
      const medida = {
        weight: producto?.peso || PAQUETE_POR_DEFECTO.peso,
        length: producto?.largo || PAQUETE_POR_DEFECTO.largo,
        width: producto?.ancho || PAQUETE_POR_DEFECTO.ancho,
        height: producto?.alto || PAQUETE_POR_DEFECTO.alto,
      }
      for (let i = 0; i < (item.cantidad || 1); i++) {
        parcels.push(medida)
        if (parcels.length >= MAX_PAQUETES) break
      }
      if (parcels.length >= MAX_PAQUETES) break
    }

    const { quotationId, tarifas } = await cotizarEnvio({ direccion, parcels })

    const tarifasOrdenadas = tarifas
      .map(r => ({
        rateId: r.id,
        proveedor: r.provider_display_name,
        servicio: r.provider_service_name,
        total: parseFloat(r.total),
        dias: r.days,
      }))
      .sort((a, b) => a.total - b.total)

    return NextResponse.json({ quotationId, tarifas: tarifasOrdenadas })
  } catch (error) {
    console.error('Error cotizando envío:', error)
    return NextResponse.json({ error: 'No se pudo cotizar el envío. Intenta de nuevo.' }, { status: 500 })
  }
}
