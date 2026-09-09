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

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const { nombre, descripcion, precio, stock, marca, tematica, universo, linea,
      tipo, disponible, activo, destacado, ultimasPiezas, anticipo, precioLiquidacion,
      fechaEstimada, imagenes, ordenDestacado } = await request.json()

    if (precio !== '' && precio !== undefined && isNaN(parseFloat(precio))) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }
    if (stock !== '' && stock !== undefined && isNaN(parseInt(stock))) {
      return NextResponse.json({ error: 'Stock inválido' }, { status: 400 })
    }

    const doc = {
      _type: 'producto',
      nombre,
      descripcion: descripcion || '',
      disponible: disponible === true,
      activo: activo === true,
      destacado: destacado === true,
      ultimasPiezas: ultimasPiezas === true,
      tipo: tipo || 'normal',
      ...(precio !== '' && precio !== undefined && { precio: parseFloat(precio) }),
      ...(stock !== '' && stock !== undefined && { stock: parseInt(stock) }),
      ...(ordenDestacado !== '' && ordenDestacado !== undefined && { ordenDestacado: parseInt(ordenDestacado) }),
      ...(marca && { marca: { _type: 'reference', _ref: marca } }),
      ...(tematica && { tematica: { _type: 'reference', _ref: tematica } }),
      ...(universo && { universo: { _type: 'reference', _ref: universo } }),
      ...(linea && { linea: { _type: 'reference', _ref: linea } }),
      ...(tipo === 'preventa' && anticipo && { anticipo: parseFloat(anticipo) }),
      ...(tipo === 'preventa' && precioLiquidacion && { precioLiquidacion: parseFloat(precioLiquidacion) }),
      ...(tipo === 'preventa' && fechaEstimada && { fechaEstimada }),
      ...(imagenes?.length > 0 && {
        imagenes: imagenes.map(assetId => ({
          _type: 'image',
          _key: Math.random().toString(36).slice(2),
          asset: { _type: 'reference', _ref: assetId }
        }))
      })
    }

    const resultado = await client.create(doc)
    return NextResponse.json({ ok: true, id: resultado._id })
  } catch (error) {
    console.error('Crear producto error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const { id, nombre, descripcion, precio, stock, marca, tematica, universo, linea,
      tipo, disponible, activo, destacado, ultimasPiezas, anticipo, precioLiquidacion,
      fechaEstimada, imagenes, ordenDestacado } = await request.json()

    if (precio !== '' && precio !== undefined && isNaN(parseFloat(precio))) {
      return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    }
    if (stock !== '' && stock !== undefined && isNaN(parseInt(stock))) {
      return NextResponse.json({ error: 'Stock inválido' }, { status: 400 })
    }

    const campos = {
      nombre,
      descripcion: descripcion || '',
      disponible: disponible === true,
      activo: activo === true,
      destacado: destacado === true,
      ultimasPiezas: ultimasPiezas === true,
      tipo: tipo || 'normal',
    }

    if (precio !== '' && precio !== undefined) campos.precio = parseFloat(precio)
    if (stock !== '' && stock !== undefined) campos.stock = parseInt(stock)
    if (ordenDestacado !== '' && ordenDestacado !== undefined) campos.ordenDestacado = parseInt(ordenDestacado)
    if (marca) campos.marca = { _type: 'reference', _ref: marca }
    if (tematica) campos.tematica = { _type: 'reference', _ref: tematica }
    if (universo) campos.universo = { _type: 'reference', _ref: universo }
    if (linea) campos.linea = { _type: 'reference', _ref: linea }
    if (tipo === 'preventa' && anticipo) campos.anticipo = parseFloat(anticipo)
    if (tipo === 'preventa' && precioLiquidacion) campos.precioLiquidacion = parseFloat(precioLiquidacion)
    if (tipo === 'preventa' && fechaEstimada) campos.fechaEstimada = fechaEstimada
    if (imagenes?.length > 0) {
      campos.imagenes = imagenes.map(assetId => ({
        _type: 'image',
        _key: Math.random().toString(36).slice(2),
        asset: { _type: 'reference', _ref: assetId }
      }))
    }

    await client.patch(id).set(campos).commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Editar producto error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const client = getSanityClient()
  try {
    const { id } = await request.json()
    await client.delete(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Eliminar producto error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}