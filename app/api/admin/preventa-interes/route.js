import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { searchParams } = new URL(request.url)
  const productoId = searchParams.get('productoId')
  if (!productoId) return NextResponse.json({ error: 'productoId requerido' }, { status: 400 })

  try {
    const { data: filas, error } = await supabase
      .from('interesados_preventa')
      .select('user_id, created_at')
      .eq('producto_id', productoId)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const interesados = []
    for (const fila of filas || []) {
      const { data: { user } } = await supabase.auth.admin.getUserById(fila.user_id)
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, apellido, telefono')
        .eq('user_id', fila.user_id)
        .single()

      interesados.push({
        nombre: perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : null,
        telefono: perfil?.telefono || null,
        email: user?.email || null,
        created_at: fila.created_at,
      })
    }

    return NextResponse.json({ ok: true, count: interesados.length, interesados })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
