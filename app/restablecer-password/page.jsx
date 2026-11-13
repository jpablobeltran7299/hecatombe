'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RestablecerPasswordPage() {
  const [lista, setLista] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [listo, setListo] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setLista(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLista(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setListo(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="bg-surface border border-line rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-black uppercase text-ink mb-1">Nueva contraseña</h1>

        {listo ? (
          <>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-4 mb-4 mt-6">
              <p className="text-green-400 text-sm">¡Listo! Tu contraseña se actualizó correctamente.</p>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition w-full"
            >
              Iniciar sesión
            </button>
          </>
        ) : !lista ? (
          <>
            <p className="text-ink-muted text-sm mb-6 mt-1">
              Este link ya no es válido o expiró. Solicita uno nuevo desde el login.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition w-full"
            >
              Ir al login
            </button>
          </>
        ) : (
          <>
            <p className="text-ink-muted text-sm mb-6 mt-1">
              Escribe tu nueva contraseña.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                className="bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition"
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
