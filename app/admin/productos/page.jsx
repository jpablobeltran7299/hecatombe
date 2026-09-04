'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTodosProductos, getMarcas, getCategorias, getTematicas, getUniversos, getLineas, urlFor, calcularPrecioFinal } from '@/lib/sanity'
import Link from 'next/link'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'bg-orange-500 border-orange-500' : 'border-line-strong group-hover:border-orange-500'
      }`}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="2" strokeLinecap="round"/></svg>}
      </span>
      <span className={`text-xs font-bold uppercase tracking-wide flex-1 ${checked ? 'text-orange-600' : 'text-ink-muted group-hover:text-ink'}`}>
        {label}
      </span>
    </label>
  )
}

function SeccionFiltro({ titulo, children, activos = 0 }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex-1 min-w-[160px]">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center justify-between w-full border rounded-lg px-3 py-2 bg-surface transition ${
          open || activos > 0 ? 'border-orange-500' : 'border-line'
        }`}>
        <span className="text-orange-600 text-xs font-black uppercase tracking-widest">
          {titulo}{activos > 0 ? ` (${activos})` : ''}
        </span>
        <span className="text-ink-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-full min-w-[180px] bg-surface border border-line rounded-lg p-2 max-h-56 overflow-y-auto shadow-lg">
          {children}
        </div>
      )}
    </div>
  )
}

export default function AdminProductos() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [tematicas, setTematicas] = useState([])
  const [universos, setUniversos] = useState([])
  const [lineas, setLineas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [marcasSel, setMarcasSel] = useState([])
  const [categoriasSel, setCategoriasSel] = useState([])
  const [tematicasSel, setTematicasSel] = useState([])
  const [universosSel, setUniversosSel] = useState([])
  const [lineasSel, setLineasSel] = useState([])
  const [ordenar, setOrdenar] = useState('recientes')
  const [eliminando, setEliminando] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [panelDescuentoAbierto, setPanelDescuentoAbierto] = useState(false)
  const [descuentoTipo, setDescuentoTipo] = useState('porcentaje')
  const [descuentoValor, setDescuentoValor] = useState('')
  const [descuentoInicio, setDescuentoInicio] = useState('')
  const [descuentoFin, setDescuentoFin] = useState('')
  const [aplicandoDescuento, setAplicandoDescuento] = useState(false)
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
    const [p, m, cat, t, u, l] = await Promise.all([
      getTodosProductos(), getMarcas(), getCategorias(), getTematicas(), getUniversos(), getLineas()
    ])
    setProductos(p)
    setMarcas(m)
    setCategorias(cat)
    setTematicas(t)
    setUniversos(u)
    setLineas(l)
    setLoading(false)
  }

  async function toggleActivo(producto) {
    await fetch('/api/admin/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productoId: producto._id,
        disponible: !producto.disponible,
        activo: !producto.disponible
      })
    })
    setProductos(prev => prev.map(p =>
      p._id === producto._id ? { ...p, disponible: !p.disponible } : p
    ))
  }

  const toggleItem = (val, sel, setSel) => {
    setSel(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  const productosFiltrados = productos.filter(p => {
    const matchBusqueda = p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase())
    if (!matchBusqueda) return false
    if (filtro === 'preventa' && p.tipo !== 'preventa') return false
    if (filtro === 'agotado' && p.disponible) return false
    if (filtro === 'sin_imagen' && p.imagenes?.length) return false
    if (marcasSel.length && !marcasSel.includes(p.marca)) return false
    if (categoriasSel.length && !categoriasSel.includes(p.categoria)) return false
    if (tematicasSel.length && !tematicasSel.includes(p.tematica)) return false
    if (universosSel.length && !universosSel.includes(p.universo)) return false
    if (lineasSel.length && !lineasSel.includes(p.linea)) return false
    return true
  }).sort((a, b) => {
    if (ordenar === 'precio_asc') return (a.precio || 0) - (b.precio || 0)
    if (ordenar === 'precio_desc') return (b.precio || 0) - (a.precio || 0)
    return 0
  })

  const filtrosCatalogoActivos = marcasSel.length + categoriasSel.length + tematicasSel.length + universosSel.length + lineasSel.length

  function limpiarFiltrosCatalogo() {
    setMarcasSel([])
    setCategoriasSel([])
    setTematicasSel([])
    setUniversosSel([])
    setLineasSel([])
  }

  function toggleSeleccion(id) {
    setSeleccionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function seleccionarTodosFiltrados() {
    setSeleccionados(prev => {
      const idsFiltrados = productosFiltrados.map(p => p._id)
      const todosYaSeleccionados = idsFiltrados.every(id => prev.has(id))
      if (todosYaSeleccionados) {
        const next = new Set(prev)
        idsFiltrados.forEach(id => next.delete(id))
        return next
      }
      return new Set([...prev, ...idsFiltrados])
    })
  }

  async function aplicarDescuentoMasivo() {
    if (!descuentoValor || isNaN(parseFloat(descuentoValor))) {
      setError('Ingresa un valor de descuento válido')
      return
    }
    setAplicandoDescuento(true)
    setError('')
    try {
      const res = await fetch('/api/admin/productos/descuento-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoIds: Array.from(seleccionados),
          accion: 'aplicar',
          tipo: descuentoTipo,
          valor: descuentoValor,
          fechaInicio: descuentoInicio,
          fechaFin: descuentoFin,
        })
      })
      const data = await res.json()
      if (data.ok) {
        const idsAfectados = new Set(seleccionados)
        setProductos(prev => prev.map(p => idsAfectados.has(p._id) ? {
          ...p,
          descuentoActivo: true,
          descuentoTipo,
          descuentoValor: parseFloat(descuentoValor),
          descuentoInicio: descuentoInicio || null,
          descuentoFin: descuentoFin || null,
        } : p))
        setPanelDescuentoAbierto(false)
        setSeleccionados(new Set())
        setDescuentoValor('')
        setDescuentoInicio('')
        setDescuentoFin('')
      } else {
        setError(data.error || 'Error al aplicar el descuento')
      }
    } catch (err) {
      setError('Error al aplicar el descuento')
    }
    setAplicandoDescuento(false)
  }

  async function quitarDescuentoMasivo() {
    setAplicandoDescuento(true)
    setError('')
    try {
      const res = await fetch('/api/admin/productos/descuento-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productoIds: Array.from(seleccionados), accion: 'quitar' })
      })
      const data = await res.json()
      if (data.ok) {
        const idsAfectados = new Set(seleccionados)
        setProductos(prev => prev.map(p => idsAfectados.has(p._id) ? { ...p, descuentoActivo: false } : p))
        setSeleccionados(new Set())
      } else {
        setError(data.error || 'Error al quitar el descuento')
      }
    } catch (err) {
      setError('Error al quitar el descuento')
    }
    setAplicandoDescuento(false)
  }

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando productos...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-ink-muted hover:text-orange-600 transition text-sm">← Admin</a>
            <h1 className="text-2xl font-black uppercase text-ink">Productos</h1>
            <span className="text-ink-muted text-sm">{productos.length} total</span>
          </div>
          <Link href="/admin/productos/nuevo"
            className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-5 py-2 rounded-xl transition">
            + Nuevo producto
          </Link>
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6"><p className="text-red-400 text-sm">{error}</p></div>}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total', value: productos.length },
            { label: 'Disponibles', value: productos.filter(p => p.disponible).length },
            { label: 'Preventas', value: productos.filter(p => p.tipo === 'preventa').length },
            { label: 'Sin imagen', value: productos.filter(p => !p.imagenes?.length).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface border border-line rounded-2xl p-4 text-center">
              <p className="text-orange-600 font-black text-2xl">{value}</p>
              <p className="text-ink-muted text-xs uppercase font-black mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o marca..."
            className="flex-1 min-w-[200px] bg-surface border border-line-strong rounded-lg px-4 py-2 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 text-sm"
          />
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'preventa', label: 'Preventas' },
            { key: 'agotado', label: 'Agotados' },
            { key: 'sin_imagen', label: 'Sin imagen' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                filtro === key ? 'bg-orange-500 text-black' : 'bg-surface text-ink-muted hover:text-ink border border-line'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Filtros tipo catálogo */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <SeccionFiltro titulo="Marca" activos={marcasSel.length}>
            {marcas.map(m => <Checkbox key={m._id} label={m.nombre} checked={marcasSel.includes(m.nombre)} onChange={() => toggleItem(m.nombre, marcasSel, setMarcasSel)} />)}
          </SeccionFiltro>
          <SeccionFiltro titulo="Categoría" activos={categoriasSel.length}>
            {categorias.map(c => <Checkbox key={c._id} label={c.nombre} checked={categoriasSel.includes(c.nombre)} onChange={() => toggleItem(c.nombre, categoriasSel, setCategoriasSel)} />)}
          </SeccionFiltro>
          <SeccionFiltro titulo="Temática" activos={tematicasSel.length}>
            {tematicas.map(t => <Checkbox key={t._id} label={t.nombre} checked={tematicasSel.includes(t.nombre)} onChange={() => toggleItem(t.nombre, tematicasSel, setTematicasSel)} />)}
          </SeccionFiltro>
          <SeccionFiltro titulo="Universo" activos={universosSel.length}>
            {universos.map(u => <Checkbox key={u._id} label={u.nombre} checked={universosSel.includes(u.nombre)} onChange={() => toggleItem(u.nombre, universosSel, setUniversosSel)} />)}
          </SeccionFiltro>
          <SeccionFiltro titulo="Tipo de artículo" activos={lineasSel.length}>
            {lineas.map(l => <Checkbox key={l._id} label={l.nombre} checked={lineasSel.includes(l.nombre)} onChange={() => toggleItem(l.nombre, lineasSel, setLineasSel)} />)}
          </SeccionFiltro>
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
            className="flex-1 min-w-[160px] bg-surface border border-line-strong text-ink-muted text-xs font-bold uppercase px-3 py-2 rounded-lg outline-none">
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
          {filtrosCatalogoActivos > 0 && (
            <button onClick={limpiarFiltrosCatalogo} className="text-xs text-orange-600 font-black uppercase tracking-widest hover:text-orange-400 shrink-0">
              ✕ Limpiar ({filtrosCatalogoActivos})
            </button>
          )}
        </div>

        {/* Barra de selección + descuento masivo */}
        {seleccionados.size > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="text-ink text-sm font-bold">{seleccionados.size} producto{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}</span>
              <button onClick={() => setPanelDescuentoAbierto(v => !v)}
                className="text-xs font-black uppercase px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-black transition">
                Aplicar descuento
              </button>
              <button onClick={quitarDescuentoMasivo} disabled={aplicandoDescuento}
                className="text-xs font-black uppercase px-3 py-1.5 rounded-lg bg-surface border border-line-strong hover:text-orange-600 text-ink-muted transition disabled:opacity-50">
                Quitar descuento
              </button>
              <button onClick={() => setSeleccionados(new Set())}
                className="text-xs font-black uppercase px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink transition">
                Cancelar selección
              </button>
            </div>

            {panelDescuentoAbierto && (
              <div className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-orange-500/20">
                <div>
                  <label className="block text-[10px] font-black uppercase text-ink-muted mb-1">Tipo</label>
                  <div className="flex gap-1">
                    <button onClick={() => setDescuentoTipo('porcentaje')}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase ${descuentoTipo === 'porcentaje' ? 'bg-orange-500 text-black' : 'bg-surface text-ink-muted border border-line'}`}>%</button>
                    <button onClick={() => setDescuentoTipo('fijo')}
                      className={`px-3 py-2 rounded-lg text-xs font-black uppercase ${descuentoTipo === 'fijo' ? 'bg-orange-500 text-black' : 'bg-surface text-ink-muted border border-line'}`}>$</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-ink-muted mb-1">Valor</label>
                  <input type="number" min="0" value={descuentoValor} onChange={e => setDescuentoValor(e.target.value)}
                    placeholder={descuentoTipo === 'porcentaje' ? 'Ej. 20' : 'Ej. 50'}
                    className="w-28 bg-page border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-ink-muted mb-1">Desde (opcional)</label>
                  <input type="date" value={descuentoInicio} onChange={e => setDescuentoInicio(e.target.value)}
                    className="bg-page border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-ink-muted mb-1">Hasta (opcional)</label>
                  <input type="date" value={descuentoFin} onChange={e => setDescuentoFin(e.target.value)}
                    className="bg-page border border-line-strong rounded-lg px-3 py-2 text-ink text-sm focus:outline-none focus:border-orange-500" />
                </div>
                <button onClick={aplicarDescuentoMasivo} disabled={aplicandoDescuento}
                  className="text-xs font-black uppercase px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black transition disabled:opacity-50">
                  {aplicandoDescuento ? 'Aplicando...' : 'Aplicar'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Seleccionar todos los filtrados */}
        {productosFiltrados.length > 0 && (
          <label className="flex items-center gap-2 mb-3 cursor-pointer w-fit">
            <input type="checkbox"
              checked={productosFiltrados.every(p => seleccionados.has(p._id))}
              onChange={seleccionarTodosFiltrados} />
            <span className="text-ink-muted text-xs font-black uppercase">Seleccionar todos los filtrados ({productosFiltrados.length})</span>
          </label>
        )}

        {/* Lista */}
        <div className="flex flex-col gap-3">
          {productosFiltrados.map(producto => {
            const { precioFinal, enOferta, porcentajeOff } = calcularPrecioFinal(producto)
            return (
            <div key={producto._id}
              className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-4">

              <input type="checkbox" checked={seleccionados.has(producto._id)} onChange={() => toggleSeleccion(producto._id)} className="flex-shrink-0" />

              {/* Imagen */}
              {producto.imagenes?.[0] ? (
                <img src={urlFor(producto.imagenes[0]).width(64).height(64).url()}
                  alt={producto.nombre}
                  className="w-14 h-14 object-contain rounded-xl bg-white flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-surface-alt rounded-xl flex items-center justify-center text-xl flex-shrink-0">🎁</div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-ink font-black text-sm truncate">{producto.nombre}</p>
                  {producto.tipo === 'preventa' && (
                    <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">PREVENTA</span>
                  )}
                  {producto.ultimasPiezas && (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">⚠️ ÚLTIMAS</span>
                  )}
                  {enOferta && (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">-{porcentajeOff}%</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-muted">
                  <span>{producto.marca}</span>
                  {producto.precio && (
                    enOferta ? (
                      <span className="flex items-center gap-1">
                        <span className="line-through">${producto.precio.toLocaleString('es-MX')}</span>
                        <span className="text-orange-600 font-black">${precioFinal.toLocaleString('es-MX')}</span>
                      </span>
                    ) : (
                      <span className="text-orange-600 font-black">${producto.precio.toLocaleString('es-MX')}</span>
                    )
                  )}
                  {producto.stock !== null && producto.stock !== undefined && (
                    <span>Stock: {producto.stock}</span>
                  )}
                </div>
              </div>

              {/* Estado */}
              <span className={`text-xs font-black uppercase px-3 py-1 rounded-full flex-shrink-0 ${
                producto.disponible
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {producto.disponible ? 'Activo' : 'Inactivo'}
              </span>

              {/* Acciones */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActivo(producto)}
                  className="text-ink-muted hover:text-orange-500 transition text-xs px-2 py-1 border border-line hover:border-orange-500 rounded-lg">
                  {producto.disponible ? 'Desactivar' : 'Activar'}
                </button>
                <Link href={`/admin/productos/${producto._id}`}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-3 py-1 rounded-lg transition">
                  Editar
                </Link>
              </div>

            </div>
            )
          })}

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-muted">No hay productos con ese filtro</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
