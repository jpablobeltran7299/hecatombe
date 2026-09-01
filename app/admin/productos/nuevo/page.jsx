'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTematicas, getLineas, getUniversos, getMarcas } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'
import ImagenesOrdenables from '../ImagenesOrdenables'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function NuevoProducto() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [marcas, setMarcas] = useState([])
  const [tematicas, setTematicas] = useState([])
  const [lineas, setLineas] = useState([])
  const [universos, setUniversos] = useState([])
  const [imagenes, setImagenes] = useState([])
  const [subiendo, setSubiendo] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    marca: '',
    tematica: '',
    universo: '',
    linea: '',
    tipo: 'normal',
    disponible: true,
    activo: true,
    destacado: false,
    ultimasPiezas: false,
    anticipo: '',
    precioLiquidacion: '',
    fechaEstimada: '',
  })

  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarOpciones()
  }, [authLoading, user])

  async function cargarOpciones() {
    const [m, t, l, u] = await Promise.all([getMarcas(), getTematicas(), getLineas(), getUniversos()])
    setMarcas(m)
    setTematicas(t)
    setLineas(l)
    setUniversos(u)
    setLoading(false)
  }

  async function subirImagen(file) {
    setSubiendo(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setSubiendo(false)
    return data.assetId ? { assetId: data.assetId, url: data.url } : null
  }

  async function handleImagenes(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const subida = await subirImagen(file)
      if (subida) {
        setImagenes(prev => [...prev, { key: subida.assetId, previewUrl: subida.url, esNueva: true, assetId: subida.assetId }])
      }
    }
  }

  function eliminarImagen(key) {
    setImagenes(prev => prev.filter(img => img.key !== key))
  }

  async function handleGuardar() {
    if (!form.nombre || !form.marca) {
      setError('Nombre y marca son obligatorios')
      return
    }
    setGuardando(true)
    setError('')

    const res = await fetch('/api/admin/producto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, imagenes: imagenes.map(img => img.assetId) })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Producto creado correctamente')
      setTimeout(() => router.push('/admin/productos'), 1500)
    } else {
      setError('Error al crear el producto')
    }
    setGuardando(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"
  const selectClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition text-sm"

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin/productos" className="text-white/40 hover:text-orange-500 transition text-sm">← Productos</a>
          <h1 className="text-2xl font-black uppercase text-white">Nuevo producto</h1>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}
        {mensaje && <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6"><p className="text-green-400 text-sm">{mensaje}</p></div>}

        <div className="flex flex-col gap-6">

          {/* Info básica */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Información básica</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Nombre *</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del producto" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del producto" rows={3} className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Precio (MXN)</label>
                  <input type="number" value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Stock inicial</label>
                  <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="Dejar vacío si no aplica" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Clasificación */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Clasificación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Marca *</label>
                <select value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar marca</option>
                  {marcas.map(m => <option key={m._id} value={m._id}>{m.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Temática</label>
                <select value={form.tematica} onChange={e => setForm({ ...form, tematica: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar temática</option>
                  {tematicas.map(t => <option key={t._id} value={t._id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Universo</label>
                <select value={form.universo} onChange={e => setForm({ ...form, universo: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar universo</option>
                  {universos.map(u => <option key={u._id} value={u._id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Línea de producto</label>
                <select value={form.linea} onChange={e => setForm({ ...form, linea: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar línea</option>
                  {lineas.map(l => <option key={l._id} value={l._id}>{l.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Tipo */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Tipo de producto</h2>
            <div className="flex gap-3 mb-4">
              {['normal', 'preventa'].map(tipo => (
                <button key={tipo} onClick={() => setForm({ ...form, tipo })}
                  className={`flex-1 py-3 rounded-xl font-black uppercase text-sm transition border-2 ${
                    form.tipo === tipo ? 'border-orange-500 bg-orange-500/10 text-orange-500' : 'border-white/10 text-white/40 hover:border-white/30'
                  }`}>
                  {tipo}
                </button>
              ))}
            </div>

            {form.tipo === 'preventa' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Anticipo (MXN)</label>
                  <input type="number" value={form.anticipo} onChange={e => setForm({ ...form, anticipo: e.target.value })} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Precio liquidación (MXN)</label>
                  <input type="number" value={form.precioLiquidacion} onChange={e => setForm({ ...form, precioLiquidacion: e.target.value })} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Fecha estimada</label>
                  <input type="date" value={form.fechaEstimada} onChange={e => setForm({ ...form, fechaEstimada: e.target.value })} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* Opciones */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Opciones</h2>
            <div className="flex flex-col gap-3">
              {[
                { key: 'disponible', label: 'Disponible', desc: 'El producto está en existencia' },
                { key: 'activo', label: 'Activo (visible en tienda)', desc: 'El producto aparece en el catálogo' },
                { key: 'destacado', label: 'Destacado', desc: 'Aparece en la sección de destacados del home' },
                { key: 'ultimasPiezas', label: 'Últimas piezas', desc: 'Muestra el badge de últimas piezas' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-white text-sm font-black">{label}</p>
                    <p className="text-white/30 text-xs">{desc}</p>
                  </div>
                  <button onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className={`w-12 h-6 rounded-full transition-colors ${form[key] ? 'bg-orange-500' : 'bg-[#333]'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${form[key] ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Imágenes */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Imágenes</h2>
            {imagenes.length > 0 && (
              <div className="mb-4">
                <ImagenesOrdenables imagenes={imagenes} onReordenar={setImagenes} onEliminar={eliminarImagen} />
                <p className="text-white/20 text-xs mt-2">Arrastra para reordenar. La primera imagen es la principal.</p>
              </div>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagenes}
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer"
            />
            {subiendo && <p className="text-orange-500 text-xs mt-2">Subiendo imagen...</p>}
          </div>

          {/* Guardar */}
          <button onClick={handleGuardar} disabled={guardando}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
            {guardando ? 'Guardando...' : '✅ Crear producto'}
          </button>

        </div>
      </div>
    </main>
  )
}