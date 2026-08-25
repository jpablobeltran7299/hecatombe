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

export async function GET() {
  const client = getSanityClient()
  try {
    const doc = await client.fetch(`*[_type == "configuracion"][0]{ heroStat }`)
    return NextResponse.json({ ok: true, configuracion: doc || null })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  const client = getSanityClient()
  try {
    const { heroStat } = await request.json()
    await client.createIfNotExists({ _id: 'configuracion', _type: 'configuracion' })
    await client.patch('configuracion').set({ heroStat }).commit()
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
