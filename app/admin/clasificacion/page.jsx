'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getTematicas, getLineas, getUniversos } from '@/lib/sanity'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminClasificacion() {
  const [loading, setLoading] = useState(true)
  const [tematicas, setTematicas] = useState([])
  const [universos, setUniversos] = useState([])
  const [lineas, setLineas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [nuevos, setNuevos] = useState({ tematica: '', universo: '', linea: '' })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarDatos()
    })
  }, [])

  async function cargarDatos() {
    const [t, u, l] = await Promise.all([getTematicas(), getUniversos(), getLineas()])
    setTematicas(t)
    setUniversos(u)
    setLineas(l)
    setLoading(false)
  }

  async function crear(tipo) {
    const nombre = nuevos[tipo].trim()
    if (!nombre) return
    setGuardando(true)
    setError('')
    setMensaje('')

    const res = await fetch('/api/admin/clasificacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, nombre })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje(`✅ ${nombre} creado correctamente`)
      setNuevos({ ...nuevos, [tipo]: '' })
      cargarDatos()
    } else {
      setError('Error al crear')
    }
    setGuardando(false)
  }

  async function eliminar(tipo, id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}"? Asegúrate de que ningún producto lo use.`)) return
    setGuardando(true)

    const res = await fetch('/api/admin/clasificacion', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje(`✅ "${nombre}" eliminado`)
      cargarDatos()
    } else {
      setError('Error al eliminar')
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  const inputClass = "flex-1 bg-black border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm"

  const SeccionClasificacion = ({ titulo, tipo, items }) => (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-black uppercase text-orange-500 mb-6">{titulo}</h2>

      {/* Agregar nuevo */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={nuevos[tipo]}
          onChange={e => setNuevos({ ...nuevos, [tipo]: e.target.value })}
          onKeyDown={e => e.key === 'Enter' && crear(tipo)}
          placeholder={`Nuevo ${titulo.toLowerCase()}...`}
          className={inputClass}
        />
        <button
          onClick={() => crear(tipo)}
          disabled={guardando || !nuevos[tipo].trim()}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
          + Agregar
        </button>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
        {items.map(item => (
          <div key={item._id} className="flex items-center justify-between bg-black rounded-lg px-4 py-2">
            <span className="text-white text-sm">{item.nombre}</span>
            <button
              onClick={() => eliminar(tipo, item._id, item.nombre)}
              disabled={guardando}
              className="text-white/20 hover:text-red-400 transition text-xs disabled:opacity-30">
              🗑
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-white/20 text-xs text-center py-4">No hay {titulo.toLowerCase()} registradas</p>
        )}
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Clasificación</h1>
        </div>

        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}
        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <SeccionClasificacion titulo="Temáticas" tipo="tematica" items={tematicas} />
          <SeccionClasificacion titulo="Universos" tipo="universo" items={universos} />
          <SeccionClasificacion titulo="Líneas" tipo="linea" items={lineas} />
        </div>

      </div>
    </main>
  )
}