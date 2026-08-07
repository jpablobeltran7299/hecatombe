'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getProducto, getTematicas, getLineas, getUniversos, getMarcas, urlFor } from '@/lib/sanity'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function EditarProducto({ params }) {
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [marcas, setMarcas] = useState([])
  const [tematicas, setTematicas] = useState([])
  const [lineas, setLineas] = useState([])
  const [universos, setUniversos] = useState([])
  const [imagenesActuales, setImagenesActuales] = useState([])
  const [imagenesNuevas, setImagenesNuevas] = useState([])
  const [subiendo, setSubiendo] = useState(false)
  const [productoId, setProductoId] = useState(null)

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
    params.then ? params.then(p => setProductoId(p.id)) : setProductoId(params.id)
  }, [params])

  useEffect(() => {
    if (!productoId) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarDatos()
    })
  }, [productoId])

  async function cargarDatos() {
    const [producto, m, t, l, u] = await Promise.all([
      getProducto(productoId),
      getMarcas(),
      getTematicas(),
      getLineas(),
      getUniversos(),
    ])

    setMarcas(m)
    setTematicas(t)
    setLineas(l)
    setUniversos(u)

    if (producto) {
      setImagenesActuales(producto.imagenes || [])
      setForm({
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio || '',
        stock: producto.stock ?? '',
        marca: producto.marca ? m.find(x => x.nombre === producto.marca)?._id || '' : '',
        tematica: producto.tematica ? t.find(x => x.nombre === producto.tematica)?._id || '' : '',
        universo: producto.universo ? u.find(x => x.nombre === producto.universo)?._id || '' : '',
        linea: producto.linea ? l.find(x => x.nombre === producto.linea)?._id || '' : '',
        tipo: producto.tipo || 'normal',
        disponible: producto.disponible ?? true,
        activo: producto.activo ?? true,
        destacado: producto.destacado ?? false,
        ultimasPiezas: producto.ultimasPiezas ?? false,
        anticipo: producto.anticipo || '',
        precioLiquidacion: producto.precioLiquidacion || '',
        fechaEstimada: producto.fechaEstimada || '',
      })
    }
    setLoading(false)
  }

  async function subirImagen(file) {
    setSubiendo(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setSubiendo(false)
    return data.assetId
  }

  async function handleImagenes(e) {
    const files = Array.from(e.target.files)
    const nuevas = []
    for (const file of files) {
      const assetId = await subirImagen(file)
      if (assetId) nuevas.push(assetId)
    }
    setImagenesNuevas(prev => [...prev, ...nuevas])
  }

  async function handleGuardar() {
    if (!form.nombre || !form.marca) {
      setError('Nombre y marca son obligatorios')
      return
    }
    setGuardando(true)
    setError('')

    const todasLasImagenes = [
      ...imagenesActuales.map(img => img.asset?._ref || img._ref),
      ...imagenesNuevas
    ].filter(Boolean)

    const res = await fetch('/api/admin/producto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productoId, ...form, imagenes: todasLasImagenes })
    })

    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Producto actualizado correctamente')
      setTimeout(() => setMensaje(''), 3000)
    } else {
      setError('Error al actualizar el producto')
    }
    setGuardando(false)
  }

  async function handleEliminar() {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return
    setEliminando(true)
    const res = await fetch('/api/admin/producto', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: productoId })
    })
    const data = await res.json()
    if (data.ok) {
      router.push('/admin/productos')
    } else {
      setError('Error al eliminar el producto')
      setEliminando(false)
    }
  }

  function eliminarImagenActual(idx) {
    setImagenesActuales(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando producto...</p>
    </main>
  )

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"
  const selectClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition text-sm"

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/admin/productos" className="text-white/40 hover:text-orange-500 transition text-sm">← Productos</a>
            <h1 className="text-2xl font-black uppercase text-white">Editar producto</h1>
          </div>
          <button onClick={handleEliminar} disabled={eliminando}
            className="text-red-400 hover:text-red-300 text-xs font-black uppercase border border-red-400/30 hover:border-red-400 px-4 py-2 rounded-lg transition disabled:opacity-50">
            {eliminando ? 'Eliminando...' : '🗑 Eliminar'}
          </button>
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
                  <label className={labelClass}>Stock</label>
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

          {/* Imágenes actuales */}
          {imagenesActuales.length > 0 && (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Imágenes actuales</h2>
              <div className="flex flex-wrap gap-3">
                {imagenesActuales.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={urlFor(img).width(100).height(100).url()} alt=""
                      className="w-20 h-20 object-contain rounded-xl bg-white" />
                    <button onClick={() => eliminarImagenActual(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agregar imágenes */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Agregar imágenes</h2>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImagenes}
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer"
            />
            {subiendo && <p className="text-orange-500 text-xs mt-2">Subiendo imagen...</p>}
            {imagenesNuevas.length > 0 && (
              <p className="text-green-400 text-xs mt-2">{imagenesNuevas.length} imagen(es) nueva(s) lista(s)</p>
            )}
          </div>

          {/* Guardar */}
          <button onClick={handleGuardar} disabled={guardando}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
            {guardando ? 'Guardando...' : '✅ Guardar cambios'}
          </button>

        </div>
      </div>
    </main>
  )
}