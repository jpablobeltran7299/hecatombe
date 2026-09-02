'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getMarcas, urlFor } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminMarcas() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [marcas, setMarcas] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [modoEditar, setModoEditar] = useState(null)
  const [logoId, setLogoId] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarMarcas()
  }, [authLoading, user])

  async function cargarMarcas() {
    const data = await getMarcas()
    setMarcas(data)
    setLoading(false)
  }

  async function handleLogo(e) {
    const file = e.target.files[0]
    if (!file) return
    setSubiendo(true)
    setLogoPreview(URL.createObjectURL(file))
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setLogoId(data.assetId)
    setSubiendo(false)
  }

  function abrirNuevo() {
    setForm({ nombre: '', descripcion: '' })
    setLogoId(null)
    setLogoPreview(null)
    setModoEditar('nuevo')
    setMensaje('')
    setError('')
  }

  function abrirEditar(marca) {
    setForm({
      nombre: marca.nombre || '',
      descripcion: marca.descripcion || '',
    })
    setLogoId(marca.logo?.asset?._ref || null)
    setLogoPreview(marca.logo ? urlFor(marca.logo).width(200).url() : null)
    setModoEditar(marca._id)
    setMensaje('')
    setError('')
  }

  async function handleGuardar() {
    if (!form.nombre) { setError('El nombre es obligatorio'); return }
    setGuardando(true)
    setError('')

    const res = await fetch('/api/admin/marca', {
      method: modoEditar === 'nuevo' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modoEditar !== 'nuevo' ? modoEditar : undefined,
        ...form,
        logoId: logoId || undefined,
      })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Marca guardada correctamente')
      await cargarMarcas()
      setTimeout(() => { setModoEditar(null); setMensaje('') }, 1500)
    } else {
      setError('Error al guardar la marca')
    }
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta marca? Asegúrate de que ningún producto la use.')) return
    setGuardando(true)
    const res = await fetch('/api/admin/marca', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.ok) {
      await cargarMarcas()
      setModoEditar(null)
    } else if (data.error === 'REFERENCIADO') {
      setError(`No se puede eliminar: ${data.count} producto(s) usan esta marca. Reasígnalos primero.`)
    } else {
      setError('Error al eliminar')
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando marcas...</p>
    </main>
  )

  const inputClass = "w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-ink-muted text-xs font-black uppercase tracking-widest mb-2 block"

  if (modoEditar) return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => setModoEditar(null)} className="text-ink-muted hover:text-orange-600 transition text-sm">← Marcas</button>
            <h1 className="text-2xl font-black uppercase text-ink">{modoEditar === 'nuevo' ? 'Nueva marca' : 'Editar marca'}</h1>
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
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Información</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre de la marca" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional" rows={3} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-600 mb-4">Logo</h2>
            {logoPreview && (
              <img src={logoPreview} alt="Preview" className="w-24 h-24 object-contain rounded-xl bg-white p-2 mb-4" />
            )}
            <input type="file" accept="image/*" onChange={handleLogo}
              className="w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer" />
            {subiendo && <p className="text-orange-600 text-xs mt-2">Subiendo logo...</p>}
          </div>

          <button onClick={handleGuardar} disabled={guardando || subiendo}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
            {guardando ? 'Guardando...' : '✅ Guardar marca'}
          </button>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-ink-muted hover:text-orange-600 transition text-sm">← Admin</a>
            <h1 className="text-2xl font-black uppercase text-ink">Marcas</h1>
            <span className="text-ink-muted text-sm">{marcas.length} total</span>
          </div>
          <button onClick={abrirNuevo}
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nueva marca
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {marcas.map(marca => (
            <div key={marca._id} className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-4">
              {marca.logo ? (
                <img src={urlFor(marca.logo).width(60).height(60).url()} alt={marca.nombre}
                  className="w-12 h-12 object-contain rounded-lg bg-white p-1 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-surface-alt rounded-lg flex items-center justify-center text-xl flex-shrink-0">🏷️</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-ink font-black text-sm truncate">{marca.nombre}</p>
                {marca.descripcion && <p className="text-ink-muted text-xs truncate mt-1">{marca.descripcion}</p>}
              </div>
              <button onClick={() => abrirEditar(marca)}
                className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition flex-shrink-0">
                Editar
              </button>
            </div>
          ))}

          {marcas.length === 0 && (
            <div className="col-span-2 text-center py-12">
              <p className="text-ink-muted">No hay marcas creadas</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}