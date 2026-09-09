import { NextResponse } from 'next/server'
import { createClient } from 'next-sanity'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }
    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen no puede pesar más de 8MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const asset = await sanityClient.assets.upload('image', buffer, {
      filename: file.name,
      contentType: file.type,
    })

    return NextResponse.json({ assetId: asset._id, url: asset.url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
