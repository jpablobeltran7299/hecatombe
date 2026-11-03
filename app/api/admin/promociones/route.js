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

function validarConfig({ nombre, modalidad, tipo, valor, alcance, productos, escalones }) {
  if (!nombre || !nombre.trim()) return 'Falta el nombre de la promoción'
  if (!['producto', 'escalonado'].includes(modalidad)) return 'Modalidad inválida'

  if (modalidad === 'escalonado') {
    if (!Array.isArray(escalones) || escalones.length === 0) {
      return 'Agrega al menos un escalón de descuento'
    }
    const minimos = new Set()
    for (const e of escalones) {
      const minimo = parseFloat(e.minimo)
      const porcentaje = parseFloat(e.porcentaje)
      if (isNaN(minimo) || minimo < 0) return 'Hay un monto mínimo inválido en los escalones'
      if (isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100) return 'Hay un porcentaje inválido en los escalones (1-100)'
      if (minimos.has(minimo)) return 'No puede haber dos escalones con el mismo monto mínimo'
      minimos.add(minimo)
    }
    return null
  }

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

function construirCampos(body) {
  if (body.modalidad === 'escalonado') {
    return {
      modalidad: 'escalonado',
      escalones: body.escalones.map(e => ({
        _type: 'escalon',
        _key: `${e.minimo}`,
        minimo: parseFloat(e.minimo),
        porcentaje: parseFloat(e.porcentaje),
      })),
      tipo: null,
      valor: null,
      alcance: null,
      productos: [],
    }
  }
  return {
    modalidad: 'producto',
    tipo: body.tipo,
    valor: parseFloat(body.valor),
    alcance: body.alcance,
    productos: body.alcance === 'seleccion'
      ? body.productos.map(id => ({ _type: 'reference', _key: id, _ref: id }))
      : [],
    escalones: [],
  }
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
      ...construirCampos(body),
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
      ...construirCampos(body),
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
