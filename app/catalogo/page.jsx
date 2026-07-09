'use client'
import { useState, useEffect, useMemo } from 'react'
import { getTodosProductos, getTematicas, getLineas, getUniversos, urlFor } from '@/lib/sanity'
import BadgesProducto from '../components/BadgesProducto'
import BotonFavoritoCard from '../components/BotonFavoritoCard'
import Link from 'next/link'

function Checkbox({ label, checked, onChange, count }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group py-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
        checked ? 'bg-orange-500 border-orange-500' : 'border-[#444] group-hover:border-orange-500'
      }`}>
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="2" strokeLinecap="round"/></svg>}
      </span>
      <span className={`text-xs font-bold uppercase tracking-wide flex-1 ${checked ? 'text-orange-500' : 'text-gray-400 group-hover:text-white'}`}>
        {label}
      </span>
      {count !== undefined && <span className="text-gray-600 text-xs">({count})</span>}
    </label>
  )
}

function SeccionFiltro({ titulo, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-[#1a1a1a] py-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-2">
        <span className="text-orange-500 text-xs font-black uppercase tracking-widest">{titulo}</span>
        <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="flex flex-col gap-0.5">{children}</div>}
    </div>
  )
}

export default function Catalogo() {
  const [productos, setProductos] = useState([])
  const [tematicas, setTematicas] = useState([])
  const [universos, setUniversos] = useState([])
  const [lineas, setLineas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [tematicasSel, setTematicasSel] = useState([])
  const [universosSel, setUniversosSel] = useState([])
  const [lineasSel, setLineasSel] = useState([])
  const [tipoSel, setTipoSel] = useState([])
  const [soloDisponibles, setSoloDisponibles] = useState(false)
  const [rangoMin, setRangoMin] = useState(0)
  const [rangoMax, setRangoMax] = useState(99999)
  const [precioMin, setPrecioMin] = useState(0)
  const [precioMax, setPrecioMax] = useState(99999)
  const [ordenar, setOrdenar] = useState('recientes')

  useEffect(() => {
    Promise.all([getTodosProductos(), getTematicas(), getUniversos(), getLineas()]).then(([p, t, u, l]) => {
      setProductos(p)
      setTematicas(t)
      setUniversos(u)
      setLineas(l)
      const precios = p.map(x => x.precio).filter(Boolean)
      if (precios.length) {
        const min = Math.min(...precios)
        const max = Math.max(...precios)
        setPrecioMin(min)
        setPrecioMax(max)
        setRangoMin(min)
        setRangoMax(max)
      }
      setCargando(false)
    })
  }, [])

  const toggleItem = (val, sel, setSel) => {
    setSel(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])
  }

  const productosFiltrados = useMemo(() => {
    let result = productos.filter(p => {
      if (busqueda && !p.nombre?.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (tematicasSel.length && !tematicasSel.includes(p.tematica)) return false
      if (universosSel.length && !universosSel.includes(p.universo)) return false
      if (lineasSel.length && !lineasSel.includes(p.linea)) return false
      if (tipoSel.length && !tipoSel.includes(p.tipo)) return false
      if (soloDisponibles && !p.disponible) return false
      if (p.precio && (p.precio < rangoMin || p.precio > rangoMax)) return false
      return true
    })
    if (ordenar === 'precio_asc') result.sort((a, b) => (a.precio || 0) - (b.precio || 0))
    else if (ordenar === 'precio_desc') result.sort((a, b) => (b.precio || 0) - (a.precio || 0))
    else if (ordenar === 'nombre') result.sort((a, b) => a.nombre?.localeCompare(b.nombre))
    return result
  }, [productos, busqueda, tematicasSel, universosSel, lineasSel, tipoSel, soloDisponibles, rangoMin, rangoMax, ordenar])

  const limpiarFiltros = () => {
    setBusqueda('')
    setTematicasSel([])
    setUniversosSel([])
    setLineasSel([])
    setTipoSel([])
    setSoloDisponibles(false)
    setRangoMin(precioMin)
    setRangoMax(precioMax)
    setOrdenar('recientes')
  }

  const filtrosActivos = tematicasSel.length + universosSel.length + lineasSel.length + tipoSel.length + (soloDisponibles ? 1 : 0)

  const sidebar = (
    <div className="flex flex-col">
      {filtrosActivos > 0 && (
        <button onClick={limpiarFiltros} className="mb-3 text-xs text-orange-500 font-black uppercase tracking-widest hover:text-orange-400 text-left">
          ✕ Limpiar filtros ({filtrosActivos})
        </button>
      )}
      <SeccionFiltro titulo="Disponibilidad">
        <Checkbox label="Solo disponibles" checked={soloDisponibles} onChange={() => setSoloDisponibles(!soloDisponibles)} />
      </SeccionFiltro>
      <SeccionFiltro titulo="Tipo">
        <Checkbox label="Normal" checked={tipoSel.includes('normal')} onChange={() => toggleItem('normal', tipoSel, setTipoSel)} />
        <Checkbox label="Preventa" checked={tipoSel.includes('preventa')} onChange={() => toggleItem('preventa', tipoSel, setTipoSel)} />
      </SeccionFiltro>
      <SeccionFiltro titulo="Categoría" defaultOpen={false}>
        {tematicas.map(t => (
          <Checkbox key={t._id} label={t.nombre} checked={tematicasSel.includes(t.nombre)}
            onChange={() => toggleItem(t.nombre, tematicasSel, setTematicasSel)}
            count={productos.filter(p => p.tematica === t.nombre).length} />
        ))}
      </SeccionFiltro>
      <SeccionFiltro titulo="Universo" defaultOpen={false}>
        {universos.map(u => (
          <Checkbox key={u._id} label={u.nombre} checked={universosSel.includes(u.nombre)}
            onChange={() => toggleItem(u.nombre, universosSel, setUniversosSel)}
            count={productos.filter(p => p.universo === u.nombre).length} />
        ))}
      </SeccionFiltro>
      <SeccionFiltro titulo="Tipo de artículo" defaultOpen={false}>
        {lineas.map(l => (
          <Checkbox key={l._id} label={l.nombre} checked={lineasSel.includes(l.nombre)}
            onChange={() => toggleItem(l.nombre, lineasSel, setLineasSel)}
            count={productos.filter(p => p.linea === l.nombre).length} />
        ))}
      </SeccionFiltro>
      <SeccionFiltro titulo="Precio" defaultOpen={false}>
        <div className="flex flex-col gap-2 mt-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">$</span>
            <input type="number" value={rangoMin} onChange={e => setRangoMin(Number(e.target.value))}
              className="w-full bg-[#111] border border-[#333] text-white text-xs px-2 py-1 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">$</span>
            <input type="number" value={rangoMax} onChange={e => setRangoMax(Number(e.target.value))}
              className="w-full bg-[#111] border border-[#333] text-white text-xs px-2 py-1 rounded" />
          </div>
        </div>
      </SeccionFiltro>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#0d0d0d]">
      <section className="bg-black border-b-2 border-orange-500 px-6 py-8">
        <h1 className="text-white text-2xl font-black uppercase tracking-wide mb-1">
          Catálogo <span className="text-orange-500">completo</span>
        </h1>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-4">
          {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2 flex-wrap">
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="flex-1 min-w-[200px] max-w-md bg-[#111] border border-[#333] focus:border-orange-500 text-white text-sm px-4 py-2 rounded-lg outline-none placeholder-gray-600 transition-colors" />
          <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
            className="bg-[#111] border border-[#333] text-gray-400 text-xs font-bold uppercase px-3 py-2 rounded-lg outline-none">
            <option value="recientes">Más recientes</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
            <option value="nombre">Nombre A-Z</option>
          </select>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden flex items-center gap-2 bg-[#111] border border-[#333] text-gray-400 text-xs font-black uppercase px-4 py-2 rounded-lg">
            Filtros {filtrosActivos > 0 && <span className="bg-orange-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">{filtrosActivos}</span>}
          </button>
        </div>
      </section>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-[#0d0d0d] border-l border-[#222] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white font-black uppercase text-sm">Filtros</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            {sidebar}
          </div>
        </div>
      )}

      <div className="px-4 py-6 flex gap-6 max-w-7xl mx-auto items-start">
        <aside className="hidden sm:block w-52 shrink-0 sticky top-20 self-start">
          <div className="bg-black border border-[#222] rounded-xl p-4 max-h-[calc(100vh-6rem)] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-[#111] [&::-webkit-scrollbar-thumb]:bg-orange-500 [&::-webkit-scrollbar-thumb]:rounded-full">
            {sidebar}
          </div>
        </aside>

        <div className="flex-1">
          {cargando ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#222] rounded-xl">
              <p className="text-gray-500 text-sm font-bold uppercase">No hay productos</p>
              <p className="text-gray-700 text-xs mt-1">Intenta con otro filtro</p>
              <button onClick={limpiarFiltros} className="mt-4 text-orange-500 text-xs font-black uppercase">Limpiar filtros</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {productosFiltrados.map((producto) => (
                <Link key={producto._id} href={`/producto/${producto._id}`}
                  className="group bg-[#111] border border-[#222] hover:border-orange-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 flex flex-col">
                  <div className="relative bg-white aspect-square flex items-center justify-center overflow-hidden">
                    <BadgesProducto producto={producto} />
                    <BotonFavoritoCard productoId={producto._id} />
                    {producto.imagenes?.[0] ? (
                      <img src={urlFor(producto.imagenes[0]).width(400).height(400).url()} alt={producto.nombre}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-5xl">🎁</span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{producto.marca}</p>
                    <p className="text-white font-bold text-sm leading-snug mb-2 flex-1">{producto.nombre}</p>
                    <div className="flex items-center justify-between mt-auto">
                      {producto.precio ? (
                        <span className="text-orange-500 font-black text-base">${producto.precio.toLocaleString('es-MX')}</span>
                      ) : (
                        <span className="text-gray-600 text-xs font-bold uppercase">Consultar</span>
                      )}
                      <span className="text-orange-500 text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity">Ver →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}