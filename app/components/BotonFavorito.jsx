'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BotonFavorito({ productoId }) {
  const [esFavorito, setEsFavorito] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    verificarFavorito()
  }, [])

  async function verificarFavorito() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('favoritos')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('producto_id', productoId)
      .single()

    if (data) setEsFavorito(true)
  }

  async function handleFavorito() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setLoading(true)

    if (esFavorito) {
      await supabase
        .from('favoritos')
        .delete()
        .eq('user_id', session.user.id)
        .eq('producto_id', productoId)
      setEsFavorito(false)
    } else {
      await supabase
        .from('favoritos')
        .insert({ user_id: session.user.id, producto_id: productoId })
      setEsFavorito(true)
    }

    setLoading(false)
  }

  return (
    <button
      onClick={handleFavorito}
      disabled={loading}
      className={`flex items-center justify-center gap-2 w-full border font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all duration-200 mb-3 ${
        esFavorito
          ? 'border-red-500 text-red-500 hover:bg-red-500/10'
          : 'border-white/20 text-white/50 hover:border-red-500 hover:text-red-500'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24"
        fill={esFavorito ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
      {esFavorito ? 'Guardado en favoritos' : 'Agregar a favoritos'}
    </button>
  )
}