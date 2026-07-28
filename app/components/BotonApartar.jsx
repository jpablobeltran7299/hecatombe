'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function BotonApartar({ productoId, nombre, anticipo, precioLiquidacion, precioTotal, imagen }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleApartar() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    setLoading(true)

    // Guardar en localStorage como item de carrito especial
    const itemApartar = {
      productoId,
      nombre,
      precio: anticipo,
      precioLiquidacion,
      precioTotal,
      imagen,
      cantidad: 1,
      tipo: 'apartado'
    }

    localStorage.setItem('apartar', JSON.stringify(itemApartar))
    window.location.href = '/checkout?modo=apartar'
    setLoading(false)
  }

  if (!anticipo) return null

  return (
    <button
      onClick={handleApartar}
      disabled={loading}
      className="flex items-center justify-center gap-3 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all duration-200 mb-3"
    >
      {loading ? 'Procesando...' : `🔒 Apartar por $${anticipo?.toLocaleString('es-MX')} MXN`}
    </button>
  )
}