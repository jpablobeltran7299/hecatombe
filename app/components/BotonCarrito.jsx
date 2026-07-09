'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function BotonCarrito({ productoId, nombre, precio, imagen }) {
  const [agregado, setAgregado] = useState(false)

  async function handleAgregar() {
    // 1. Leer carrito actual de localStorage
    const carritoLocal = JSON.parse(localStorage.getItem('carrito') || '[]')
    const existe = carritoLocal.find(i => i.productoId === productoId)

    if (!existe) {
      carritoLocal.push({ productoId, nombre, precio, imagen, cantidad: 1 })
    } else {
      existe.cantidad += 1
    }
    localStorage.setItem('carrito', JSON.stringify(carritoLocal))
    window.dispatchEvent(new Event('carritoActualizado'))

    // 2. Si hay sesión activa, sync a Supabase
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: existente } = await supabase
        .from('carrito')
        .select('id, cantidad')
        .eq('user_id', session.user.id)
        .eq('producto_id', productoId)
        .single()

      if (existente) {
        await supabase
          .from('carrito')
          .update({ cantidad: existente.cantidad + 1 })
          .eq('id', existente.id)
      } else {
        await supabase
          .from('carrito')
          .insert({ user_id: session.user.id, producto_id: productoId, cantidad: 1 })
      }
    }

    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  return (
    <button
      onClick={handleAgregar}
      className={`flex items-center justify-center gap-3 w-full font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all duration-200 mb-3 ${
        agregado
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 hover:bg-orange-600 text-white'
      }`}
    >
      {agregado ? (
        <>✓ Agregado al carrito</>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Agregar al carrito
        </>
      )}
    </button>
  )
}