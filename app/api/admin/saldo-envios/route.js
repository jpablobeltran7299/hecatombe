import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { obtenerSaldo } from '@/lib/soloenvios'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  try {
    const saldo = await obtenerSaldo()
    return NextResponse.json(saldo)
  } catch (error) {
    console.error('Error obteniendo saldo de Solo Envíos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
