'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getTodosProductos, urlFor } from '@/lib/sanity'
import { createClient } from 'next-sanity'

const sanityWriter = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  token: process.env.NEXT_PUBLIC_SANITY_WRITE_TOKEN,
  useCdn: false,
})

export default function AdminInventario() {
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.email !== 'hecatombe.9194@gmail.com') {
        router.push('/')
        return
      }
      cargarProductos()
    })
  }, [])

  async function cargarProductos() {
    const data = await getTodosProductos()
    setProductos(data)
    setLoading(false)
  }

  async function actualizarStock(productoId, nuevoStock) {
    setGuardando(productoId)
    try {
      await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, stock: nuevoStock })
      })
      setProductos(prev => prev.map(p =>
        p._id === productoId
          ? { ...p, stock: nuevoStock, disponible: nuevoStock > 0 }
          : p
      ))
    } catch (err) {
      console.error(err)
    }
    setGuardando(null)
  }

  async function toggleDisponible(producto) {
    setGuardando(producto._id)
    try {
      await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: producto._id,
          disponible: !producto.disponible,
          activo: !producto.disponible
        })
      })
      setProductos(prev => prev.map(p =>
        p._id === producto._id
          ? { ...p, disponible: !p.disponible, activo: !p.disponible }
          : p
      ))
    } catch (err) {
      console.error(err)
    }
    setGuardando(null)
  }

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    if (filtro === 'sin_stock') return matchBusqueda && p.stock === 0
    if (filtro === 'ultimas') return matchBusqueda && p.ultimasPiezas
    if (filtro === 'sin_stock_config') return matchBusqueda && (p.stock === null || p.stock === undefined)
    return matchBusqueda
  })

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando inventario...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Inventario</h1>
          <span className="text-white/30 text-sm">{productos.length} productos</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="flex-1 min-w-[200px] bg-[#111] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm"
          />
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'sin_stock', label: 'Sin stock' },
            { key: 'ultimas', label: 'Últimas piezas' },
            { key: 'sin_stock_config', label: 'Sin stock configurado' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                filtro === key ? 'bg-orange-500 text-black' : 'bg-[#111] text-white/40 hover:text-white border border-white/10'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 text-xs font-black uppercase text-white/30">
            <div className="col-span-1">Img</div>
            <div className="col-span-4">Nombre</div>
            <div className="col-span-2">Precio</div>
            <div className="col-span-2">Stock</div>
            <div className="col-span-2">Estado</div>
            <div className="col-span-1">Acción</div>
          </div>

          {productosFiltrados.map(producto => (
            <div key={producto._id}
              className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/5 items-center hover:bg-white/2 transition">

              {/* Imagen */}
              <div className="col-span-1">
                {producto.imagenes?.[0] ? (
                  <img src={urlFor(producto.imagenes[0]).width(48).height(48).url()}
                    alt={producto.nombre}
                    className="w-10 h-10 object-contain rounded-lg bg-white" />
                ) : (
                  <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-lg">🎁</div>
                )}
              </div>

              {/* Nombre */}
              <div className="col-span-4">
                <p className="text-white text-sm font-bold truncate">{producto.nombre}</p>
                <p className="text-white/30 text-xs">{producto.marca}</p>
              </div>

              {/* Precio */}
              <div className="col-span-2">
                <span className="text-orange-500 font-black text-sm">
                  ${producto.precio?.toLocaleString('es-MX') || '—'}
                </span>
              </div>

              {/* Stock editable */}
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  defaultValue={producto.stock ?? ''}
                  placeholder="—"
                  onBlur={e => {
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val !== producto.stock) {
                      actualizarStock(producto._id, val)
                    }
                  }}
                  className="w-20 bg-black border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500 text-center"
                />
                {producto.ultimasPiezas && (
                  <span className="ml-2 text-yellow-400 text-xs font-black">⚠️</span>
                )}
              </div>

              {/* Estado */}
              <div className="col-span-2">
                <span className={`text-xs font-black uppercase px-2 py-1 rounded-full ${
                  producto.disponible
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {producto.disponible ? 'Disponible' : 'Agotado'}
                </span>
              </div>

              {/* Toggle */}
              <div className="col-span-1">
                <button
                  onClick={() => toggleDisponible(producto)}
                  disabled={guardando === producto._id}
                  className="text-white/30 hover:text-orange-500 transition text-xs disabled:opacity-30">
                  {guardando === producto._id ? '...' : '✏️'}
                </button>
              </div>

            </div>
          ))}

          {productosFiltrados.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-white/30">No hay productos con ese filtro</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}