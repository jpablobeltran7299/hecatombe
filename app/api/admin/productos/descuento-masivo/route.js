import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'

export const dynamic = 'force-dynamic'

const getSanityClient = () => createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

export async function POST(request) {
  const client = getSanityClient()
  try {
    const { productoIds, accion, tipo, valor, fechaInicio, fechaFin } = await request.json()

    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return NextResponse.json({ error: 'No hay productos seleccionados' }, { status: 400 })
    }

    if (accion === 'quitar') {
      const transaction = productoIds.reduce(
        (tx, id) => tx.patch(id, p => p.set({ descuentoActivo: false })),
        client.transaction()
      )
      await transaction.commit()
      return NextResponse.json({ ok: true, actualizados: productoIds.length })
    }

    if (accion === 'aplicar') {
      if (!['porcentaje', 'fijo'].includes(tipo) || !valor || isNaN(parseFloat(valor))) {
        return NextResponse.json({ error: 'Tipo o valor de descuento inválido' }, { status: 400 })
      }

      const campos = {
        descuentoActivo: true,
        descuentoTipo: tipo,
        descuentoValor: parseFloat(valor),
        descuentoInicio: fechaInicio || null,
        descuentoFin: fechaFin || null,
      }

      const transaction = productoIds.reduce(
        (tx, id) => tx.patch(id, p => p.set(campos)),
        client.transaction()
      )
      await transaction.commit()
      return NextResponse.json({ ok: true, actualizados: productoIds.length })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    console.error('Descuento masivo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
