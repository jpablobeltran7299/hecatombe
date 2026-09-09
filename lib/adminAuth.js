import { ADMINS } from './constants'
import { getAuthUser } from './auth'

// Verifica que la petición traiga un token de sesión de Supabase válido Y
// que pertenezca a un correo en ADMINS. Las rutas /api/admin/* dependían
// solo del gate visual en el cliente (React) — cualquiera podía llamarlas
// directo sin iniciar sesión. Usar así al inicio de cada handler:
//
//   const auth = await requireAdmin(request)
//   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
export async function requireAdmin(request) {
  const auth = await getAuthUser(request)
  if (!auth.ok) return auth

  if (!ADMINS.includes(auth.user.email)) {
    return { ok: false, status: 403, error: 'No autorizado' }
  }

  return auth
}
