'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTodosProductos, urlFor } from '@/lib/sanity'
import Link from 'next/link'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminProductos() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [eliminando, setEliminando] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarProductos()
  }, [authLoading, user])

  async function cargarProductos() {
    const data = await getTodosProductos()
    setProductos(data)
    setLoading(false)
  }

  async function toggleActivo(producto) {
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
      p._id === producto._id ? { ...p, disponible: !p.disponible } : p
    ))
  }

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase())
    if (filtro === 'preventa') return matchBusqueda && p.tipo === 'preventa'
    if (filtro === 'agotado') return matchBusqueda && !p.disponible
    if (filtro === 'sin_imagen') return matchBusqueda && !p.imagenes?.length
    return matchBusqueda
  })

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando productos...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
            <h1 className="text-2xl font-black uppercase text-white">Productos</h1>
            <span className="text-white/30 text-sm">{productos.length} total</span>
          </div>
          <Link href="/admin/productos/nuevo"
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nuevo producto
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: productos.length },
            { label: 'Disponibles', value: productos.filter(p => p.disponible).length },
            { label: 'Preventas', value: productos.filter(p => p.tipo === 'preventa').length },
            { label: 'Sin imagen', value: productos.filter(p => !p.imagenes?.length).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-orange-500 font-black text-2xl">{value}</p>
              <p className="text-white/30 text-xs uppercase font-black mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o marca..."
            className="flex-1 min-w-[200px] bg-[#111] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm"
          />
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'preventa', label: 'Preventas' },
            { key: 'agotado', label: 'Agotados' },
            { key: 'sin_imagen', label: 'Sin imagen' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                filtro === key ? 'bg-orange-500 text-black' : 'bg-[#111] text-white/40 hover:text-white border border-white/10'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex flex-col gap-3">
          {productosFiltrados.map(producto => (
            <div key={producto._id}
              className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4">

              {/* Imagen */}
              {producto.imagenes?.[0] ? (
                <img src={urlFor(producto.imagenes[0]).width(64).height(64).url()}
                  alt={producto.nombre}
                  className="w-14 h-14 object-contain rounded-xl bg-white flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎁</div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white font-black text-sm truncate">{producto.nombre}</p>
                  {producto.tipo === 'preventa' && (
                    <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">PREVENTA</span>
                  )}
                  {producto.ultimasPiezas && (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">⚠️ ÚLTIMAS</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/30">
                  <span>{producto.marca}</span>
                  {producto.precio && <span className="text-orange-500 font-black">${producto.precio.toLocaleString('es-MX')}</span>}
                  {producto.stock !== null && producto.stock !== undefined && (
                    <span>Stock: {producto.stock}</span>
                  )}
                </div>
              </div>

              {/* Estado */}
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full flex-shrink-0 ${
                producto.disponible
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {producto.disponible ? 'Activo' : 'Inactivo'}
              </span>

              {/* Acciones */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActivo(producto)}
                  className="text-white/30 hover:text-orange-500 transition text-xs px-2 py-1 border border-white/10 hover:border-orange-500 rounded-lg">
                  {producto.disponible ? 'Desactivar' : 'Activar'}
                </button>
                <Link href={`/admin/productos/${producto._id}`}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-3 py-1 rounded-lg transition">
                  Editar
                </Link>
              </div>

            </div>
          ))}

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30">No hay productos con ese filtro</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}