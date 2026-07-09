'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BotonFavoritoCard({ productoId }) {
  const [esFavorito, setEsFavorito] = useState(false)
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

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    if (esFavorito) {
      await supabase.from('favoritos').delete()
        .eq('user_id', session.user.id)
        .eq('producto_id', productoId)
      setEsFavorito(false)
    } else {
      await supabase.from('favoritos').insert({
        user_id: session.user.id,
        producto_id: productoId
      })
      setEsFavorito(true)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
        esFavorito
          ? 'bg-red-500/20 text-red-500'
          : 'bg-black/40 text-white/40 hover:text-red-400 hover:bg-black/60'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24"
        fill={esFavorito ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth="2.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    </button>
  )
}