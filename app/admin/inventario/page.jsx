'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTodosProductos, urlFor } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

// Componente fuera del padre para que cada fila maneje su propio input/estado de guardado
function FilaStock({ producto, onGuardar }) {
  const [valor, setValor] = useState(producto.stock ?? '')
  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)

  async function handleGuardar() {
    const val = parseInt(valor)
    if (isNaN(val)) return
    setGuardando(true)
    const ok = await onGuardar(producto._id, val)
    setGuardando(false)
    if (ok) {
      setGuardadoOk(true)
      setTimeout(() => setGuardadoOk(false), 1500)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="number"
        min="0"
        value={valor}
        placeholder="—"
        onChange={e => setValor(e.target.value)}
        className="w-20 bg-black border border-white/20 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-orange-500 text-center"
      />
      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="text-xs font-black uppercase px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-black disabled:opacity-50 transition">
        {guardando ? 'Guardando...' : guardadoOk ? '✅' : 'Guardar'}
      </button>
      {producto.ultimasPiezas && (
        <span className="text-yellow-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 whitespace-nowrap">
          Últimas piezas
        </span>
      )}
    </div>
  )
}

export default function AdminInventario() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(null)
  const [filtro, setFiltro] = useState('todos')
  const [error, setError] = useState('')
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

  async function actualizarStock(productoId, nuevoStock) {
    setError('')
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoId, stock: nuevoStock })
      })
      const data = await res.json()
      if (data.ok) {
        setProductos(prev => prev.map(p =>
          p._id === productoId
            ? { ...p, stock: nuevoStock, disponible: nuevoStock > 0, ultimasPiezas: nuevoStock <= 3 && nuevoStock > 0 }
            : p
        ))
        return true
      }
      setError('Error al guardar')
      return false
    } catch (err) {
      setError('Error al guardar')
      return false
    }
  }

  async function toggleDisponible(producto) {
    setGuardando(producto._id)
    setError('')
    try {
      const res = await fetch('/api/admin/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: producto._id,
          disponible: !producto.disponible,
          activo: !producto.disponible
        })
      })
      const data = await res.json()
      if (data.ok) {
        setProductos(prev => prev.map(p =>
          p._id === producto._id
            ? { ...p, disponible: !p.disponible, activo: !p.disponible }
            : p
        ))
      } else {
        setError('Error al guardar')
      }
    } catch (err) {
      setError('Error al guardar')
    }
    setGuardando(null)
  }

  const productosFiltrados = productos.filter(p => {
  const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  if (filtro === 'sin_stock') return matchBusqueda && (p.stock === 0 || !p.disponible)
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

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}

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

              <div className="col-span-1">
                {producto.imagenes?.[0] ? (
                  <img src={urlFor(producto.imagenes[0]).width(48).height(48).url()}
                    alt={producto.nombre}
                    className="w-10 h-10 object-contain rounded-lg bg-white" />
                ) : (
                  <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-lg">🎁</div>
                )}
              </div>

              <div className="col-span-4">
                <p className="text-white text-sm font-bold truncate">{producto.nombre}</p>
                <p className="text-white/30 text-xs">{producto.marca}</p>
              </div>

              <div className="col-span-2">
                <span className="text-orange-500 font-black text-sm">
                  ${producto.precio?.toLocaleString('es-MX') || '—'}
                </span>
              </div>

              <div className="col-span-2">
                <FilaStock producto={producto} onGuardar={actualizarStock} />
              </div>

              <div className="col-span-2">
                <span className={`text-xs font-black uppercase px-2 py-1 rounded-full ${
                  producto.disponible
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {producto.disponible ? 'Disponible' : 'Agotado'}
                </span>
              </div>

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