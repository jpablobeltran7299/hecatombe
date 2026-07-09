'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CarritoPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarCarrito()
  }, [])

  async function cargarCarrito() {
    const carritoLocal = JSON.parse(localStorage.getItem('carrito') || '[]')
    setItems(carritoLocal)
    setLoading(false)
  }

  function eliminar(productoId) {
    const nuevo = items.filter(i => i.productoId !== productoId)
    setItems(nuevo)
    localStorage.setItem('carrito', JSON.stringify(nuevo))
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
                      className="w-16 h-16 object-cover rounded-lg bg-[#1a1a1a]" />
                  ) : (
                    <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-2xl">📦</div>
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
              <button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-4 rounded-xl transition opacity-50 cursor-not-allowed"
                disabled>
                Proceder al pago (próximamente)
              </button>
              <p className="text-white/20 text-xs text-center mt-3">El pago estará disponible con Mercado Pago</p>
            </div>
          </>
        )}
      </div>
    </main>
  )
}