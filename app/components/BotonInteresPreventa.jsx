'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Se muestra en vez de "Apartar" cuando una preventa ya se quedó sin piezas
// (stock <= 0). Deja registrado el interés del cliente para que el equipo
// de Hecatombe vea cuánta gente más quiere esa pieza y decida si conseguir más.
export default function BotonInteresPreventa({ productoId }) {
  const [loading, setLoading] = useState(false)
  const [registrado, setRegistrado] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleClick() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/preventa-interes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productoId }),
      })
      const data = await res.json()
      if (data.ok) setRegistrado(true)
      else setError('No se pudo registrar tu interés. Intenta de nuevo.')
    } catch {
      setError('No se pudo registrar tu interés. Intenta de nuevo.')
    }
    setLoading(false)
  }

  if (registrado) {
    return (
      <div className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-black text-sm uppercase tracking-widest py-4 rounded-xl text-center mb-3">
        ✓ Te avisaremos si conseguimos más piezas
      </div>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center justify-center gap-3 w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10 disabled:opacity-50 font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all duration-200 mb-1"
      >
        {loading ? 'Registrando...' : '🙋 Avísame si consiguen más'}
      </button>
      {error && <p className="text-red-400 text-xs text-center mb-2">{error}</p>}
    </>
  )
}
