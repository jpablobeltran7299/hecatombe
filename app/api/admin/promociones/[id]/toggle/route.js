import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const getSanityClient = () => createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// Prende o apaga una promoción ya guardada, aplicando/quitando el descuento
// en los productos reales de Sanity. Guarda un snapshot de los productos
// afectados al prender (`productosAfectados`) para poder apagarla
// correctamente después aunque el catálogo haya cambiado mientras tanto
// (productos nuevos agregados, productos desactivados, etc).
//
// OJO: usa los mismos campos de descuento (`descuentoActivo`, etc.) que el
// descuento masivo manual de /admin/productos — si un producto tiene un
// descuento puesto a mano ahí y también está en una promoción, el último que
// se togglee gana, y apagar la promoción le borra también ese descuento
// manual. No mezclar ambas herramientas sobre los mismos productos a la vez.
export async function POST(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  const { id } = await params

  try {
    const { activar } = await request.json()
    const promo = await client.fetch(
      `*[_id == $id][0]{ _id, nombre, modalidad, tipo, valor, alcance, activa, productosAfectados, "productos": productos[]._ref }`,
      { id }
    )
    if (!promo) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })

    // La modalidad "escalonado" no toca productos — solo prende/apaga su
    // propio flag, que app/api/checkout/route.js lee al calcular el total.
    // Solo puede haber una activa a la vez (el checkout no sabría cuál
    // usar si hubiera dos).
    if (promo.modalidad === 'escalonado') {
      if (activar) {
        if (promo.activa) return NextResponse.json({ ok: true })
        const otraActiva = await client.fetch(
          `*[_type == "promocion" && modalidad == "escalonado" && activa == true && _id != $id][0]{ nombre }`,
          { id }
        )
        if (otraActiva) {
          return NextResponse.json({ error: `Ya está activa la promoción escalonada "${otraActiva.nombre}" — apágala primero.` }, { status: 400 })
        }
      }
      await client.patch(id).set({ activa: !!activar }).commit()
      return NextResponse.json({ ok: true })
    }

    if (activar) {
      if (promo.activa) return NextResponse.json({ ok: true, productosAfectados: promo.productosAfectados || [] })

      const productoIds = promo.alcance === 'catalogo'
        ? (await client.fetch(`*[_type == "producto" && activo != false]._id`))
        : (promo.productos || [])

      if (productoIds.length === 0) {
        return NextResponse.json({ error: 'No hay productos a los que aplicar esta promoción' }, { status: 400 })
      }

      const campos = {
        descuentoActivo: true,
        descuentoTipo: promo.tipo,
        descuentoValor: promo.valor,
        descuentoInicio: null,
        descuentoFin: null,
      }
      const tx = productoIds.reduce((t, pid) => t.patch(pid, p => p.set(campos)), client.transaction())
      await tx.commit()

      await client.patch(id).set({ activa: true, productosAfectados: productoIds }).commit()
      return NextResponse.json({ ok: true, productosAfectados: productoIds })
    }

    // Apagar: revertir exactamente el snapshot que se guardó al prenderla.
    if (!promo.activa) return NextResponse.json({ ok: true })

    const idsARevertir = promo.productosAfectados || []
    if (idsARevertir.length > 0) {
      const tx = idsARevertir.reduce(
        (t, pid) => t.patch(pid, p => p.set({ descuentoActivo: false })),
        client.transaction()
      )
      await tx.commit()
    }
    await client.patch(id).set({ activa: false }).commit()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(`Error al activar/desactivar promoción ${id}:`, e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
