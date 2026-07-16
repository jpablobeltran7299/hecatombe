'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CarritoPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const e = params.get('estado')
    if (e) setEstado(e)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    cargarCarrito()
  }, [])

  function cargarCarrito() {
    const carritoLocal = JSON.parse(localStorage.getItem('carrito') || '[]')
    setItems(carritoLocal)
    setLoading(false)
  }

  function eliminar(productoId) {
    const nuevo = items.filter(i => i.productoId !== productoId)
    setItems(nuevo)
    localStorage.setItem('carrito', JSON.stringify(nuevo))
    window.dispatchEvent(new Event('carritoActualizado'))
  }

  function cambiarCantidad(productoId, delta) {
    const nuevo = items.map(i => {
      if (i.productoId === productoId) {
        const cantidad = Math.max(1, i.cantidad + delta)
        return { ...i, cantidad }
      }
      return i
    })
    setItems(nuevo)
    localStorage.setItem('carrito', JSON.stringify(nuevo))
    window.dispatchEvent(new Event('carritoActualizado'))
  }

  function handlePagar() {
    if (!user) {
      window.location.href = '/login'
      return
    }
    window.location.href = '/checkout'
  }

  const total = items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-black uppercase text-white mb-8">Mi carrito</h1>

        {/* Mensajes de estado */}
        {estado === 'exitoso' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6">
            <p className="text-green-400 font-black uppercase text-sm">✅ ¡Pago exitoso! Tu pedido está confirmado.</p>
          </div>
        )}
        {estado === 'fallido' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6">
            <p className="text-red-400 font-black uppercase text-sm">❌ El pago no se pudo procesar. Intenta de nuevo.</p>
          </div>
        )}
        {estado === 'pendiente' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6">
            <p className="text-yellow-400 font-black uppercase text-sm">⏳ Pago pendiente. Te notificaremos cuando se confirme.</p>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-white/40 text-lg mb-6">Tu carrito está vacío</p>
            <Link href="/catalogo"
              className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 mb-8">
              {items.map(item => (
                <div key={item.productoId}
                  className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre}
                      className="w-16 h-16 object-contain rounded-lg bg-white flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black uppercase text-sm truncate">{item.nombre}</p>
                    <p className="text-orange-500 font-black">${item.precio?.toLocaleString('es-MX')} MXN</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cambiarCantidad(item.productoId, -1)}
                      className="w-8 h-8 bg-[#222] hover:bg-orange-500 text-white rounded-lg font-black transition">−</button>
                    <span className="text-white font-black w-6 text-center">{item.cantidad}</span>
                    <button onClick={() => cambiarCantidad(item.productoId, 1)}
                      className="w-8 h-8 bg-[#222] hover:bg-orange-500 text-white rounded-lg font-black transition">+</button>
                  </div>
                  <button onClick={() => eliminar(item.productoId)}
                    className="text-white/30 hover:text-red-400 transition ml-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-white/60 uppercase font-black text-sm">Total</span>
                <span className="text-orange-500 font-black text-2xl">${total.toLocaleString('es-MX')} MXN</span>
              </div>
              {!user && (
                <p className="text-white/40 text-xs text-center mb-3">
                  Necesitas <Link href="/login" className="text-orange-500 hover:underline">iniciar sesión</Link> para proceder al pago
                </p>
              )}
              <button
                onClick={handlePagar}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-4 rounded-xl transition">
                💳 Proceder al pago
              </button>
              <p className="text-white/20 text-xs text-center mt-3">Pago seguro con Mercado Pago</p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}