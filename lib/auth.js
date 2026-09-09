import { createClient } from '@supabase/supabase-js'

// Verifica que la petición traiga un token de sesión de Supabase válido
// (de CUALQUIER usuario logueado, no solo admins). Usar en rutas API que
// requieren que el cliente esté autenticado pero no restringidas a admin.
export async function getAuthUser(request) {
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

  if (error || !user) {
    return { ok: false, status: 401, error: 'No autorizado' }
  }

  return { ok: true, user }
}
