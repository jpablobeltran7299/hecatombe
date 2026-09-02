'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTematicas, getLineas, getUniversos } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

const ETIQUETAS_TIPO = {
  tematica: 'esta temática',
  universo: 'este universo',
  linea: 'esta línea',
}

// Componente fuera del padre para evitar re-render
function SeccionClasificacion({ titulo, tipo, items, onCrear, onEliminar, guardando }) {
  const [nuevo, setNuevo] = useState('')

  function handleCrear() {
    if (!nuevo.trim()) return
    onCrear(tipo, nuevo.trim())
    setNuevo('')
  }

  return (
    <div className="bg-surface border border-line rounded-2xl p-6">
      <h2 className="text-lg font-black uppercase text-orange-600 mb-6">{titulo}</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={nuevo}
          onChange={e => setNuevo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCrear()}
          placeholder={`Nuevo ${titulo.toLowerCase()}...`}
          className="flex-1 bg-page border border-line-strong rounded-lg px-3 py-2 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 text-sm min-w-0"
        />
        <button
          onClick={handleCrear}
          disabled={guardando || !nuevo.trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-3 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0">
          + Agregar
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {items.map(item => (
          <div key={item._id} className="flex items-center justify-between bg-surface-alt rounded-lg px-3 py-2 gap-2">
            <span className="text-ink text-sm truncate">{item.nombre}</span>
            <button
              onClick={() => onEliminar(item._id, item.nombre, tipo)}
              disabled={guardando}
              className="text-ink-muted hover:text-red-400 transition text-xs disabled:opacity-30 flex-shrink-0">
              🗑
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-ink-muted text-xs text-center py-4">No hay {titulo.toLowerCase()} registradas</p>
        )}
      </div>
    </div>
  )
}

export default function AdminClasificacion() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tematicas, setTematicas] = useState([])
  const [universos, setUniversos] = useState([])
  const [lineas, setLineas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarDatos()
  }, [authLoading, user])

  async function cargarDatos() {
    const [t, u, l] = await Promise.all([getTematicas(), getUniversos(), getLineas()])
    setTematicas(t)
    setUniversos(u)
    setLineas(l)
    setLoading(false)
  }

  async function crear(tipo, nombre) {
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const res = await fetch('/api/clasificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, nombre })
      })

      const data = await res.json()
      if (data.ok) {
        setMensaje(`✅ "${nombre}" creado correctamente`)
        cargarDatos()
      } else {
        setError('Error al crear')
      }
    } catch (err) {
      setError('Error al crear: no se pudo conectar con el servidor')
    }
    setGuardando(false)
  }

  async function eliminar(id, nombre, tipo) {
    if (!confirm(`¿Eliminar "${nombre}"? Asegúrate de que ningún producto lo use.`)) return
    setGuardando(true)
    setError('')
    setMensaje('')

    try {
      const res = await fetch('/api/clasificacion', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      const data = await res.json()
      if (data.ok) {
        setMensaje(`✅ "${nombre}" eliminado`)
        cargarDatos()
      } else if (data.error === 'REFERENCIADO') {
        const etiqueta = ETIQUETAS_TIPO[tipo] || 'esta clasificación'
        setError(`No se puede eliminar: ${data.count} producto(s) usan ${etiqueta}. Reasígnalos primero.`)
      } else {
        setError('Error al eliminar')
      }
    } catch (err) {
      setError('Error al eliminar: no se pudo conectar con el servidor')
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-ink-muted hover:text-orange-600 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-ink">Clasificación</h1>
        </div>

        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <SeccionClasificacion titulo="Temáticas" tipo="tematica" items={tematicas} onCrear={crear} onEliminar={eliminar} guardando={guardando} />
          <SeccionClasificacion titulo="Universos" tipo="universo" items={universos} onCrear={crear} onEliminar={eliminar} guardando={guardando} />
          <SeccionClasificacion titulo="Líneas" tipo="linea" items={lineas} onCrear={crear} onEliminar={eliminar} guardando={guardando} />
        </div>

      </div>
    </main>
  )
}