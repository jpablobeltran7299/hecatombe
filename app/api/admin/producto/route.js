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

// Crear producto
export async function POST(request) {
  const client = getSanityClient()
  try {
    const body = await request.json()
    const { nombre, descripcion, precio, stock, marca, tematica, universo, linea,
      tipo, disponible, activo, destacado, ultimasPiezas, anticipo, precioLiquidacion,
      fechaEstimada, imagenes } = body

    const doc = {
      _type: 'producto',
      nombre,
      descripcion: descripcion || '',
      precio: precio ? parseFloat(precio) : undefined,
      stock: stock ? parseInt(stock) : undefined,
      disponible: disponible ?? true,
      activo: activo ?? true,
      destacado: destacado ?? false,
      ultimasPiezas: ultimasPiezas ?? false,
      tipo: tipo || 'normal',
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

// Editar producto
export async function PUT(request) {
  const client = getSanityClient()
  try {
    const body = await request.json()
    const { id, nombre, descripcion, precio, stock, marca, tematica, universo, linea,
      tipo, disponible, activo, destacado, ultimasPiezas, anticipo, precioLiquidacion,
      fechaEstimada, imagenes } = body

    const patch = client.patch(id).set({
      nombre,
      descripcion: descripcion || '',
      precio: precio ? parseFloat(precio) : undefined,
      stock: stock !== '' ? parseInt(stock) : undefined,
      disponible: disponible ?? true,
      activo: activo ?? true,
      destacado: destacado ?? false,
      ultimasPiezas: ultimasPiezas ?? false,
      tipo: tipo || 'normal',
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
    })

    await patch.commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Editar producto error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Eliminar producto
export async function DELETE(request) {
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