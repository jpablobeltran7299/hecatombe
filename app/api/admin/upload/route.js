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
    const formData = await request.formData()
    const file = formData.get('file')
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
