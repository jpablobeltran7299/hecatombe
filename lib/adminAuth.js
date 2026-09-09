import { createClient } from '@supabase/supabase-js'
import { ADMINS } from './constants'

// Verifica que la petición traiga un token de sesión de Supabase válido Y
// que pertenezca a un correo en ADMINS. Las rutas /api/admin/* dependían
// solo del gate visual en el cliente (React) — cualquiera podía llamarlas
// directo sin iniciar sesión. Usar así al inicio de cada handler:
//
//   const auth = await requireAdmin(request)
//   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
export async function requireAdmin(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { ok: false, status: 401, error: 'No autorizado (falta token)' }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user || !ADMINS.includes(user.email)) {
    return { ok: false, status: 403, error: 'No autorizado' }
  }

  return { ok: true, user }
}
