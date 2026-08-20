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

const TIPOS_VALIDOS = ['tematica', 'universo', 'linea']

export async function POST(request) {
  const client = getSanityClient()
  try {
    const { tipo, nombre } = await request.json()
    if (!TIPOS_VALIDOS.includes(tipo)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

    const doc = await client.create({ _type: tipo, nombre })
    return NextResponse.json({ ok: true, id: doc._id })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const client = getSanityClient()
  try {
    const { id } = await request.json()
    const referencias = await client.fetch(`count(*[references($id)])`, { id })
    if (referencias > 0) {
      return NextResponse.json({ error: 'REFERENCIADO', count: referencias }, { status: 409 })
    }
    await client.delete(id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}