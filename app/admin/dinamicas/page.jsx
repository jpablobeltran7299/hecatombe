'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getDinamicas, urlFor } from '@/lib/sanity'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

const TIPOS = [
  { value: 'rifa', label: 'Rifa' },
  { value: 'concurso', label: 'Concurso' },
  { value: 'flash_sale', label: 'Flash Sale' },
  { value: 'trivia', label: 'Trivia' },
  { value: 'ruleta', label: 'Ruleta' },
  { value: 'carrera', label: 'Carrera' },
  { value: 'loteria', label: 'Lotería' },
]

export default function AdminDinamicas() {
  const [loading, setLoading] = useState(true)
  const [dinamicas, setDinamicas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [modoEditar, setModoEditar] = useState(null)
  const [imagenId, setImagenId] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', tipo: 'rifa',
    fechaFin: '', enlace: '', activa: true, destacada: false,
    numerosTotal: '', numerosVendidos: [], precio: ''
  })
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarDinamicas()
    })
  }, [])

  async function cargarDinamicas() {
    const data = await getDinamicas()
    setDinamicas(data)
    setLoading(false)
  }

  async function handleImagen(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendo(true)
    setImagenPreview(URL.createObjectURL(file))
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setImagenId(data.assetId)
    setSubiendo(false)
  }

  function abrirNuevo() {
    setForm({ titulo: '', descripcion: '', tipo: 'rifa', fechaFin: '', enlace: '', activa: true, destacada: false, numerosTotal: '', numerosVendidos: [], precio: '' })
    setImagenId(null)
    setImagenPreview(null)
    setModoEditar('nuevo')
    setMensaje('')
    setError('')
  }

  function abrirEditar(dinamica) {
    setForm({
      titulo: dinamica.titulo || '',
      descripcion: dinamica.descripcion || '',
      tipo: dinamica.tipo || 'rifa',
      fechaFin: dinamica.fechaFin ? dinamica.fechaFin.slice(0, 16) : '',
      enlace: dinamica.enlace || '',
      activa: dinamica.activa ?? true,
      destacada: dinamica.destacada ?? false,
      numerosTotal: dinamica.numerosTotal || '',
      numerosVendidos: dinamica.numerosVendidos || [],
      precio: dinamica.precio || '',
    })
    setImagenId(dinamica.imagen?.asset?._ref || null)
    setImagenPreview(dinamica.imagen ? urlFor(dinamica.imagen).width(400).url() : null)
    setModoEditar(dinamica._id)
    setMensaje('')
    setError('')
  }

  async function handleGuardar() {
    if (!form.titulo || !form.tipo) { setError('Título y tipo son obligatorios'); return }
    setGuardando(true)
    setError('')

    const body = {
      ...form,
      numerosTotal: form.numerosTotal ? parseInt(form.numerosTotal) : undefined,
      precio: form.precio ? parseFloat(form.precio) : undefined,
      imagenId: imagenId || undefined,
    }

    const res = await fetch('/api/admin/dinamica', {
      method: modoEditar === 'nuevo' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modoEditar !== 'nuevo' ? modoEditar : undefined, ...body })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Dinámica guardada correctamente')
      await cargarDinamicas()
      setTimeout(() => { setModoEditar(null); setMensaje('') }, 1500)
    } else {
      setError('Error al guardar')
    }
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta dinámica?')) return
    setGuardando(true)
    const res = await fetch('/api/admin/dinamica', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.ok) {
      await cargarDinamicas()
      setModoEditar(null)
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando dinámicas...</p>
    </main>
  )

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"

  if (modoEditar) return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setModoEditar(null)} className="text-white/40 hover:text-orange-500 transition text-sm">← Dinámicas</button>
            <h1 className="text-2xl font-black uppercase text-white">{modoEditar === 'nuevo' ? 'Nueva dinámica' : 'Editar dinámica'}</h1>
          </div>
          {modoEditar !== 'nuevo' && (
            <button onClick={() => handleEliminar(modoEditar)} disabled={guardando}
              className="text-red-400 hover:text-red-300 text-xs font-black uppercase border border-red-400/30 hover:border-red-400 px-4 py-2 rounded-lg transition">
              🗑 Eliminar
            </button>
          )}
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}
        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}

        <div className="flex flex-col gap-6">

          {/* Info básica */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Información</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Título *</label>
                <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título de la dinámica" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe la dinámica" rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map(t => (
                    <button key={t.value} onClick={() => setForm({ ...form, tipo: t.value })}
                      className={`py-2 rounded-lg font-black uppercase text-xs transition border-2 ${
                        form.tipo === t.value ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fecha de cierre</label>
                  <input type="datetime-local" value={form.fechaFin} onChange={e => setForm({ ...form, fechaFin: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Enlace externo</label>
                  <input type="url" value={form.enlace} onChange={e => setForm({ ...form, enlace: e.target.value })} placeholder="https://..." className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Precio (MXN)</label>
                <input type="number" min="0" step="0.01" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="Déjalo vacío si es gratis" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Solo rifas */}
          {form.tipo === 'rifa' && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Configuración de rifa</h2>
              <div>
                <label className={labelClass}>Total de números</label>
                <input type="number" value={form.numerosTotal} onChange={e => setForm({ ...form, numerosTotal: e.target.value })} placeholder="Ej: 100" className={inputClass} />
              </div>
            </div>
          )}

          {/* Opciones */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-black">Activa</p>
                <p className="text-white/30 text-xs">La dinámica aparece en la página</p>
              </div>
              <button onClick={() => setForm({ ...form, activa: !form.activa })}
                className={`w-12 h-6 rounded-full transition-colors ${form.activa ? 'bg-orange-500' : 'bg-[#333]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.activa ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-black">Destacada</p>
                <p className="text-white/30 text-xs">Se muestra en el popup del home (requiere estar activa)</p>
              </div>
              <button onClick={() => setForm({ ...form, destacada: !form.destacada })}
                className={`w-12 h-6 rounded-full transition-colors ${form.destacada ? 'bg-orange-500' : 'bg-[#333]'}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form.destacada ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Imagen */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Imagen</h2>
            {imagenPreview && (
              <img src={imagenPreview} alt="Preview" className="w-full rounded-xl mb-4 object-cover" style={{ maxHeight: 200 }} />
            )}
            <input type="file" accept="image/*" onChange={handleImagen}
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer" />
            {subiendo && <p className="text-orange-500 text-xs mt-2">Subiendo imagen...</p>}
          </div>

          <button onClick={handleGuardar} disabled={guardando || subiendo}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
            {guardando ? 'Guardando...' : '✅ Guardar dinámica'}
          </button>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
            <h1 className="text-2xl font-black uppercase text-white">Dinámicas</h1>
          </div>
          <button onClick={abrirNuevo}
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nueva dinámica
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {dinamicas.map(dinamica => (
            <div key={dinamica._id} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
              {dinamica.imagen ? (
                <img src={urlFor(dinamica.imagen).width(80).height(80).url()} alt={dinamica.titulo}
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm truncate">{dinamica.titulo}</p>
                <div className="flex gap-3 text-xs text-white/30 mt-1">
                  <span className="capitalize">{dinamica.tipo}</span>
                  <span className={dinamica.activa ? 'text-green-400' : 'text-red-400'}>{dinamica.activa ? 'Activa' : 'Inactiva'}</span>
                  {dinamica.precio && <span>${dinamica.precio} MXN</span>}
                  {dinamica.fechaFin && <span>Cierre: {new Date(dinamica.fechaFin).toLocaleDateString('es-MX')}</span>}
                </div>
              </div>
              <button onClick={() => abrirEditar(dinamica)}
                className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition flex-shrink-0">
                Editar
              </button>
            </div>
          ))}

          {dinamicas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30">No hay dinámicas creadas</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}