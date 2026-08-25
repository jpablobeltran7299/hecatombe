'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminConfiguracion() {
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [heroStat, setHeroStat] = useState({ mostrar: true, texto: '800+ Productos', link: '' })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarConfiguracion()
    })
  }, [])

  async function cargarConfiguracion() {
    const res = await fetch('/api/admin/configuracion')
    const data = await res.json()
    if (data.configuracion?.heroStat) {
      setHeroStat({
        mostrar: data.configuracion.heroStat.mostrar ?? true,
        texto: data.configuracion.heroStat.texto || '',
        link: data.configuracion.heroStat.link || '',
      })
    }
    setLoading(false)
  }

  async function handleGuardar() {
    setGuardando(true)
    setError('')
    setMensaje('')

    const res = await fetch('/api/admin/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroStat }),
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Configuración guardada correctamente')
      setTimeout(() => setMensaje(''), 2000)
    } else {
      setError('Error al guardar')
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando configuración...</p>
    </main>
  )

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Configuración del sitio</h1>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}
        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}

        <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-black uppercase text-orange-500 mb-2">Bloque de estadística (hero del home)</h2>
          <p className="text-white/30 text-xs mb-6">El cuadro naranja junto al título principal del home. Ej: &quot;800+ Productos&quot;.</p>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-black">Mostrar bloque</p>
                <p className="text-white/30 text-xs">Si está apagado, el bloque no aparece en el home</p>
              </div>
              <button onClick={() => setHeroStat({ ...heroStat, mostrar: !heroStat.mostrar })}
                className={`w-12 h-6 rounded-full transition-colors ${heroStat.mostrar ? 'bg-orange-500' : 'bg-[#333]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${heroStat.mostrar ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div>
              <label className={labelClass}>Texto</label>
              <input type="text" value={heroStat.texto} onChange={e => setHeroStat({ ...heroStat, texto: e.target.value })}
                placeholder="Ej: 800+ Productos" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Link (ruta interna)</label>
              <input type="text" value={heroStat.link} onChange={e => setHeroStat({ ...heroStat, link: e.target.value })}
                placeholder="Ej: /catalogo, /dinamicas, /producto/xxxx" className={inputClass} />
              <p className="text-white/20 text-xs mt-2">Déjalo vacío para que el bloque no sea clickeable.</p>
            </div>
          </div>
        </div>

        <button onClick={handleGuardar} disabled={guardando}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm mt-6">
          {guardando ? 'Guardando...' : '✅ Guardar configuración'}
        </button>
      </div>
    </main>
  )
}
