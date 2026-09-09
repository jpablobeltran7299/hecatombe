'use client'

import { supabase } from './supabase'

// Igual que fetch(), pero agrega el token de sesión actual como
// Authorization: Bearer — las rutas /api/admin/* lo exigen ahora
// (ver lib/adminAuth.js). Usar para TODAS las llamadas del panel de
// admin a sus propias rutas API.
export async function adminFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {
    ...(options.headers || {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
  return fetch(url, { ...options, headers })
}
