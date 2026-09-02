'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modoRecuperar, setModoRecuperar] = useState(false)
  const [mensajeRecuperar, setMensajeRecuperar] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/cuenta'
    setLoading(false)
  }

  async function handleRecuperar(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/cuenta`,
    })
    if (error) setError(error.message)
    else setMensajeRecuperar('¡Listo! Revisa tu correo para restablecer tu contraseña.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="bg-surface border border-line rounded-2xl p-8 w-full max-w-md">

        {modoRecuperar ? (
          <>
            <h1 className="text-2xl font-black uppercase text-ink mb-1">Recuperar contraseña</h1>
            <p className="text-ink-muted text-sm mb-6">
              Te enviaremos un link a tu correo para crear una nueva contraseña.
            </p>

            {mensajeRecuperar ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-4 mb-4">
                <p className="text-green-400 text-sm">{mensajeRecuperar}</p>
              </div>
            ) : (
              <form onSubmit={handleRecuperar} className="flex flex-col gap-4">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500"
                />
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition"
                >
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </form>
            )}

            <button
              onClick={() => { setModoRecuperar(false); setMensajeRecuperar(''); setError('') }}
              className="mt-4 text-ink-muted hover:text-ink text-sm transition w-full text-center"
            >
              ← Volver al inicio de sesión
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black uppercase text-ink mb-1">Inicia sesión</h1>
            <p className="text-ink-muted text-sm mb-6">
              ¿No tienes cuenta?{' '}
              <Link href="/registro" className="text-orange-600 hover:underline">Regístrate</Link>
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500"
              />
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setModoRecuperar(true)}
                  className="text-ink-muted hover:text-orange-600 text-xs text-right transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition"
              >
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </button>
            </form>
          </>
        )}

      </div>
    </main>
  )
}