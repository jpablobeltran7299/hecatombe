'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ADMINS } from '@/lib/constants'
import { adminFetch } from '@/lib/adminFetch'
import { getPromocionesAdmin, getTodosProductosParaAdmin } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const FORM_VACIO = {
  nombre: '',
  modalidad: 'producto',
  tipo: 'porcentaje',
  valor: '',
  alcance: 'catalogo',
  productos: new Set(),
  escalones: [{ minimo: '', porcentaje: '' }],
}

export default function AdminPromociones() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [promociones, setPromociones] = useState([])
  const [productos, setProductos] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [cargandoToggle, setCargandoToggle] = useState(null)
  const [error, setError] = useState('')
  const [modoEditar, setModoEditar] = useState(null) // null = lista, 'nuevo' = crear, id = editar
  const [form, setForm] = useState(FORM_VACIO)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargar()
  }, [authLoading, user])

  async function cargar() {
    const [p, prods] = await Promise.all([getPromocionesAdmin(), getTodosProductosParaAdmin()])
    setPromociones(p)
    setProductos(prods.filter(prod => prod.activo !== false))
    setLoading(false)
  }

  function abrirNuevo() {
    setForm(FORM_VACIO)
    setModoEditar('nuevo')
    setError('')
  }

  function abrirEditar(promo) {
    setForm({
      nombre: promo.nombre,
      modalidad: promo.modalidad || 'producto',
      tipo: promo.tipo || 'porcentaje',
      valor: promo.valor != null ? String(promo.valor) : '',
      alcance: promo.alcance || 'catalogo',
      productos: new Set((promo.productos || []).map(p => p._id)),
      escalones: (promo.escalones || []).length > 0
        ? promo.escalones.map(e => ({ minimo: String(e.minimo), porcentaje: String(e.porcentaje) }))
        : [{ minimo: '', porcentaje: '' }],
    })
    setModoEditar(promo._id)
    setError('')
  }

  async function handleGuardar() {
    setGuardando(true)
    setError('')
    const res = await adminFetch('/api/admin/promociones', {
      method: modoEditar === 'nuevo' ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modoEditar !== 'nuevo' ? modoEditar : undefined,
        nombre: form.nombre,
        modalidad: form.modalidad,
        tipo: form.tipo,
        valor: form.valor,
        alcance: form.alcance,
        productos: Array.from(form.productos),
        escalones: form.escalones.filter(e => e.minimo !== '' && e.porcentaje !== ''),
      }),
    })
    const data = await res.json()
    if (data.ok) {
      await cargar()
      setModoEditar(null)
    } else {
      setError(data.error || 'Error al guardar la promoción')
    }
    setGuardando(false)
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar esta promoción? (debe estar apagada)')) return
    setGuardando(true)
    const res = await adminFetch('/api/admin/promociones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const data = await res.json()
    if (data.ok) {
      await cargar()
    } else {
      alert(data.error || 'Error al eliminar')
    }
    setGuardando(false)
  }

  async function handleToggle(promo) {
    setCargandoToggle(promo._id)
    const res = await adminFetch(`/api/admin/promociones/${promo._id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activar: !promo.activa }),
    })
    const data = await res.json()
    if (!data.ok) alert(data.error || 'Error al cambiar la promoción')
    await cargar()
    setCargandoToggle(null)
  }

  function toggleProducto(id) {
    setForm(prev => {
      const nuevo = new Set(prev.productos)
      if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id)
      return { ...prev, productos: nuevo }
    })
  }

  function actualizarEscalon(idx, campo, valor) {
    setForm(prev => ({
      ...prev,
      escalones: prev.escalones.map((e, i) => i === idx ? { ...e, [campo]: valor } : e),
    }))
  }

  function agregarEscalon() {
    setForm(prev => ({ ...prev, escalones: [...prev.escalones, { minimo: '', porcentaje: '' }] }))
  }

  function quitarEscalon(idx) {
    setForm(prev => ({ ...prev, escalones: prev.escalones.filter((_, i) => i !== idx) }))
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando promociones...</p>
    </main>
  )

  const inputClass = "w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 transition text-sm"
  const labelClass = "text-ink-muted text-xs font-black uppercase tracking-widest mb-2 block"

  if (modoEditar) return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setModoEditar(null)} className="text-ink-muted hover:text-orange-600 transition text-sm">← Promociones</button>
          <h1 className="text-2xl font-black uppercase text-ink">{modoEditar === 'nuevo' ? 'Nueva promoción' : 'Editar promoción'}</h1>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}

        <div className="flex flex-col gap-6">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Configuración</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className={labelClass}>Nombre</label>
                <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Buen Fin 2026" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Tipo de promoción</label>
                <div className="flex gap-1">
                  <button onClick={() => setForm({ ...form, modalidad: 'producto' })}
                    className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.modalidad === 'producto' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>
                    Descuento por producto
                  </button>
                  <button onClick={() => setForm({ ...form, modalidad: 'escalonado' })}
                    className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.modalidad === 'escalonado' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>
                    Escalonado por monto de compra
                  </button>
                </div>
                <p className="text-ink-muted text-xs mt-2">
                  {form.modalidad === 'producto'
                    ? 'Baja el precio tachado de los productos que elijas.'
                    : 'Ej: "compra +$500 → 10% OFF". Se calcula sobre el total del carrito (sin envío), solo en compras normales. Solo puede haber una escalonada activa a la vez.'}
                </p>
              </div>

              {form.modalidad === 'producto' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <div className="flex gap-1">
                        <button onClick={() => setForm({ ...form, tipo: 'porcentaje' })}
                          className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.tipo === 'porcentaje' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>%</button>
                        <button onClick={() => setForm({ ...form, tipo: 'fijo' })}
                          className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.tipo === 'fijo' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>$</button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Valor</label>
                      <input type="number" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })}
                        placeholder={form.tipo === 'porcentaje' ? 'Ej. 20' : 'Ej. 50'} className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Alcance</label>
                    <div className="flex gap-1">
                      <button onClick={() => setForm({ ...form, alcance: 'catalogo' })}
                        className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.alcance === 'catalogo' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>
                        Todo el catálogo
                      </button>
                      <button onClick={() => setForm({ ...form, alcance: 'seleccion' })}
                        className={`flex-1 px-3 py-3 rounded-lg text-xs font-black uppercase ${form.alcance === 'seleccion' ? 'bg-orange-500 text-black' : 'bg-page text-ink-muted border border-line'}`}>
                        Productos específicos
                      </button>
                    </div>
                    <p className="text-ink-muted text-xs mt-2">
                      {form.alcance === 'catalogo'
                        ? 'Al prenderla, aplica a todos los productos activos en ese momento (los que agregues después NO se incluyen automáticamente).'
                        : `${form.productos.size} producto${form.productos.size !== 1 ? 's' : ''} seleccionado${form.productos.size !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelClass}>Escalones</label>
                  <div className="flex flex-col gap-2">
                    {form.escalones.map((e, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-ink-muted text-xs font-black">+$</span>
                        <input type="number" min="0" value={e.minimo} onChange={ev => actualizarEscalon(idx, 'minimo', ev.target.value)}
                          placeholder="500" className={inputClass} />
                        <span className="text-ink-muted text-xs font-black">→</span>
                        <input type="number" min="0" max="100" value={e.porcentaje} onChange={ev => actualizarEscalon(idx, 'porcentaje', ev.target.value)}
                          placeholder="10" className={inputClass} />
                        <span className="text-ink-muted text-xs font-black">%</span>
                        <button onClick={() => quitarEscalon(idx)} className="text-red-400 hover:text-red-300 text-xs font-black px-2 flex-shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={agregarEscalon} className="text-orange-600 hover:text-orange-500 text-xs font-black uppercase mt-3">
                    + Agregar escalón
                  </button>
                </div>
              )}
            </div>
          </div>

          {form.modalidad === 'producto' && form.alcance === 'seleccion' && (
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-4">Elegir productos</h2>
              <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {productos.map(p => (
                  <label key={p._id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-page cursor-pointer">
                    <input type="checkbox" checked={form.productos.has(p._id)} onChange={() => toggleProducto(p._id)} />
                    <span className="text-ink text-sm">{p.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleGuardar} disabled={guardando}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase py-4 rounded-xl transition text-sm">
            {guardando ? 'Guardando...' : '✅ Guardar promoción'}
          </button>
          <p className="text-ink-muted text-xs text-center -mt-3">
            Esto solo guarda la configuración. Para que el descuento se vea en la tienda, prende el switch desde la lista.
          </p>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-ink-muted hover:text-orange-600 transition text-sm">← Admin</a>
            <h1 className="text-2xl font-black uppercase text-ink">Promociones</h1>
          </div>
          <button onClick={abrirNuevo}
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nueva promoción
          </button>
        </div>
        <p className="text-ink-muted text-xs mb-8">
          Nota: si un producto ya tiene un descuento puesto a mano desde /admin/productos, no lo metas también a una promoción "por producto" de aquí — apagarla le borraría ese descuento manual.
        </p>

        <div className="flex flex-col gap-4">
          {promociones.map(promo => (
            <div key={promo._id} className="bg-surface border border-line rounded-2xl p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-ink font-black text-sm">{promo.nombre}</p>
                <div className="flex gap-3 text-xs text-ink-muted mt-1 flex-wrap">
                  {promo.modalidad === 'escalonado' ? (
                    <>
                      <span>Escalonado por monto de compra</span>
                      <span>{(promo.escalones || []).map(e => `+$${e.minimo}→${e.porcentaje}%`).join(' · ')}</span>
                    </>
                  ) : (
                    <>
                      <span>{promo.tipo === 'fijo' ? `$${promo.valor} MXN` : `${promo.valor}%`} de descuento</span>
                      <span>{promo.alcance === 'catalogo' ? 'Todo el catálogo' : `${(promo.productos || []).length} producto(s)`}</span>
                    </>
                  )}
                  {promo.activa && (
                    <span className="text-green-400">
                      🟢 Activa{promo.modalidad !== 'escalonado' ? ` — ${(promo.productosAfectados || []).length} producto(s) con el descuento puesto` : ''}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => abrirEditar(promo)} disabled={promo.activa}
                className="text-xs font-black uppercase px-4 py-2 rounded-lg bg-page border border-line-strong text-ink-muted hover:text-orange-600 transition disabled:opacity-30 flex-shrink-0">
                Editar
              </button>
              <button onClick={() => handleEliminar(promo._id)} disabled={promo.activa || guardando}
                className="text-xs font-black uppercase px-3 py-2 rounded-lg text-red-400 hover:text-red-300 transition disabled:opacity-30 flex-shrink-0">
                🗑
              </button>
              <button onClick={() => handleToggle(promo)} disabled={cargandoToggle === promo._id}
                className={`w-14 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${promo.activa ? 'bg-orange-500' : 'bg-surface-alt'}`}>
                <div className={`w-6 h-6 bg-white rounded-full transition-transform mx-0.5 ${promo.activa ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}

          {promociones.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-muted">No hay promociones creadas</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
