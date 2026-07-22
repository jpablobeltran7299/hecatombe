'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegistroPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegistro(e) {
    e.preventDefault()
    setError('')
    setMensaje('')
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setMensaje('¡Cuenta creada! Revisa tu correo para confirmar tu registro.')
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-black uppercase text-white mb-1">Crea tu cuenta</h1>
        <p className="text-white/50 text-sm mb-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-orange-500 hover:underline">Inicia sesión</Link>
        </p>

        <form onSubmit={handleRegistro} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500"
          />
          <input
            type="password"
            placeholder="Repetir contraseña"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            required
            className="bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500"
          />
          <ul className="text-white/40 text-xs space-y-1 pl-1">
            <li className={password.length >= 8 ? 'text-green-400' : ''}>• Al menos 8 caracteres</li>
            <li className={/[0-9!@#$%^&*]/.test(password) ? 'text-green-400' : ''}>• Al menos un número o símbolo especial</li>
          </ul>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {mensaje && <p className="text-green-400 text-sm">{mensaje}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-lg transition"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </main>
  )
}