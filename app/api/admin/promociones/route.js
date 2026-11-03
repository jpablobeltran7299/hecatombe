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

function validarConfig({ nombre, tipo, valor, alcance, productos }) {
  if (!nombre || !nombre.trim()) return 'Falta el nombre de la promoción'
  if (!['porcentaje', 'fijo'].includes(tipo)) return 'Tipo de descuento inválido'
  const valorNum = parseFloat(valor)
  if (!valor || isNaN(valorNum) || valorNum <= 0) return 'Valor de descuento inválido'
  if (tipo === 'porcentaje' && valorNum > 100) return 'El porcentaje no puede ser mayor a 100'
  if (!['catalogo', 'seleccion'].includes(alcance)) return 'Alcance inválido'
  if (alcance === 'seleccion' && (!Array.isArray(productos) || productos.length === 0)) {
    return 'Elige al menos un producto para esta promoción'
  }
  return null
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const body = await request.json()
    const error = validarConfig(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const doc = await client.create({
      _type: 'promocion',
      nombre: body.nombre.trim(),
      tipo: body.tipo,
      valor: parseFloat(body.valor),
      alcance: body.alcance,
      productos: body.alcance === 'seleccion'
        ? body.productos.map(id => ({ _type: 'reference', _key: id, _ref: id }))
        : [],
      activa: false,
      productosAfectados: [],
    })
    return NextResponse.json({ ok: true, id: doc._id })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Falta el id de la promoción' }, { status: 400 })

    const promo = await client.fetch(`*[_id == $id][0]{ activa }`, { id })
    if (!promo) return NextResponse.json({ error: 'Promoción no encontrada' }, { status: 404 })
    if (promo.activa) {
      return NextResponse.json({ error: 'Apaga la promoción antes de editarla' }, { status: 400 })
    }

    const error = validarConfig(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    await client.patch(id).set({
      nombre: body.nombre.trim(),
      tipo: body.tipo,
      valor: parseFloat(body.valor),
      alcance: body.alcance,
      productos: body.alcance === 'seleccion'
        ? body.productos.map(pid => ({ _type: 'reference', _key: pid, _ref: pid }))
        : [],
    }).commit()
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const { id } = await request.json()
    const promo = await client.fetch(`*[_id == $id][0]{ activa }`, { id })
    if (promo?.activa) {
      return NextResponse.json({ error: 'Apaga la promoción antes de eliminarla' }, { status: 400 })
    }
    await client.delete(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
