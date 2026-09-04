import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })

  try {
    const { productoId, stock, disponible, activo } = await request.json()

    const patch = sanityClient.patch(productoId)

    if (stock !== undefined) {
      patch.set({
        stock,
        disponible: stock > 0,
        activo: stock > 0,
        ultimasPiezas: stock <= 3 && stock > 0,
      })
    }

    if (disponible !== undefined) {
      patch.set({ disponible })
    }

    if (activo !== undefined) {
      patch.set({ activo })
    }

    await patch.commit()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin stock error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}