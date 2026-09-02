'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBanners, urlFor } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminBanners() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [banners, setBanners] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [modoEditar, setModoEditar] = useState(null) // null = lista, 'nuevo' = crear, id = editar
  const [form, setForm] = useState({
    tag: '', titulo: '', subtitulo: '', cta: '', href: '',
    orden: 1, activo: true, mostrarTexto: false
  })
  const [imagenId, setImagenId] = useState(null)
  const [imagenPreview, setImagenPreview] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarBanners()
  }, [authLoading, user])

  async function cargarBanners() {
    const data = await getBanners()
    setBanners(data)
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
    setForm({ tag: '', titulo: '', subtitulo: '', cta: '', href: '', orden: banners.length + 1, activo: true, mostrarTexto: false })
    setImagenId(null)
    setImagenPreview(null)
    setModoEditar('nuevo')
    setMensaje('')
    setError('')
  }

  function abrirEditar(banner) {
    setForm({
      tag: banner.tag || '',
      titulo: banner.titulo || '',
      subtitulo: banner.subtitulo || '',
      cta: banner.cta || '',
      href: banner.href || '',
      orden: banner.orden || 1,
      activo: banner.activo ?? true,
      mostrarTexto: banner.mostrarTexto ?? false,
    })
    setImagenId(banner.imagen?.asset?._ref || null)
    setImagenPreview(banner.imagen ? urlFor(banner.imagen).width(400).url() : null)
    setModoEditar(banner._id)
    setMensaje('')
    setError('')
  }

  async function handleGuardar() {
    if (!imagenId) { setError('La imagen es obligatoria'); return }
    setGuardando(true)
    setError('')

    const res = await fetch('/api/admin/banner', {
      method: modoEditar === 'nuevo' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modoEditar !== 'nuevo' ? modoEditar : undefined,
        ...form,
        imagenId
      })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Banner guardado correctamente')
      await cargarBanners()
      setTimeout(() => { setModoEditar(null); setMensaje('') }, 1500)
    } else {
      setError('Error al guardar el banner')
    }
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este banner?')) return
    setGuardando(true)
    const res = await fetch('/api/admin/banner', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.ok) {
      await cargarBanners()
      setModoEditar(null)
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando banners...</p>
    </main>
  )

  const inputClass = "w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-ink-muted text-xs font-black uppercase tracking-widest mb-2 block"

  if (modoEditar) return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setModoEditar(null)} className="text-ink-muted hover:text-orange-600 transition text-sm">← Banners</button>
          <h1 className="text-2xl font-black uppercase text-ink">{modoEditar === 'nuevo' ? 'Nuevo banner' : 'Editar banner'}</h1>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}
        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}

        <div className="flex flex-col gap-6">

          {/* Imagen */}
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-600 mb-4">Imagen *</h2>
            {imagenPreview && (
              <img src={imagenPreview} alt="Preview" className="w-full rounded-xl mb-4 object-cover" style={{ maxHeight: 200 }} />
            )}
            <input type="file" accept="image/*" onChange={handleImagen}
              className="w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer" />
            {subiendo && <p className="text-orange-600 text-xs mt-2">Subiendo imagen...</p>}
          </div>

          {/* Config */}
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Configuración</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Orden</label>
                  <input type="number" value={form.orden} onChange={e => setForm({ ...form, orden: parseInt(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Link</label>
                  <input type="text" value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} placeholder="/catalogo" className={inputClass} />
                </div>
              </div>
              <p className="text-ink-muted text-xs -mt-2">
                Si el banner es solo imagen, todo el banner será clickeable a este link. Si tiene texto, este link se usa en el botón.
              </p>

              {/* Toggles */}
              {[
                { key: 'activo', label: 'Activo', desc: 'El banner aparece en la tienda' },
                { key: 'mostrarTexto', label: 'Mostrar texto sobre el banner', desc: 'Activa para mostrar título, subtítulo y botón encima de la imagen' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-line last:border-0">
                  <div>
                    <p className="text-ink text-sm font-black">{label}</p>
                    <p className="text-ink-muted text-xs">{desc}</p>
                  </div>
                  <button onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className={`w-12 h-6 rounded-full transition-colors ${form[key] ? 'bg-orange-500' : 'bg-surface-alt'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form[key] ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Texto — solo si mostrarTexto */}
          {form.mostrarTexto && (
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Texto del banner</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className={labelClass}>Etiqueta (ej: FLASH SALE)</label>
                  <input type="text" value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="PREVENTA ACTIVA" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Título principal</label>
                  <input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título del banner" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Subtítulo</label>
                  <input type="text" value={form.subtitulo} onChange={e => setForm({ ...form, subtitulo: e.target.value })} placeholder="Subtítulo opcional" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Texto del botón</label>
                  <input type="text" value={form.cta} onChange={e => setForm({ ...form, cta: e.target.value })} placeholder="Ver catálogo" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleGuardar} disabled={guardando || subiendo}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
              {guardando ? 'Guardando...' : '✅ Guardar banner'}
            </button>
            {modoEditar !== 'nuevo' && (
              <button onClick={() => handleEliminar(modoEditar)} disabled={guardando}
                className="px-6 border border-red-400/30 hover:border-red-400 text-red-400 font-black uppercase text-sm rounded-xl transition">
                🗑
              </button>
            )}
          </div>
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
            <h1 className="text-2xl font-black uppercase text-ink">Banners</h1>
          </div>
          <button onClick={abrirNuevo}
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nuevo banner
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {banners.map(banner => (
            <div key={banner._id} className="bg-surface border border-line rounded-2xl overflow-hidden flex items-center gap-4 p-4">
              {banner.imagen && (
                <img src={urlFor(banner.imagen).width(120).height(60).url()}
                  alt={banner.titulo}
                  className="w-24 h-14 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-ink font-black text-sm truncate">{banner.titulo || 'Sin título'}</p>
                <div className="flex gap-3 text-xs text-ink-muted mt-1">
                  <span>Orden: {banner.orden}</span>
                  <span className={banner.activo ? 'text-green-400' : 'text-red-400'}>{banner.activo ? 'Activo' : 'Inactivo'}</span>
                  <span>{banner.mostrarTexto ? 'Con texto' : 'Solo imagen'}</span>
                </div>
              </div>
              <button onClick={() => abrirEditar(banner)}
                className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition flex-shrink-0">
                Editar
              </button>
            </div>
          ))}

          {banners.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-muted">No hay banners creados</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}