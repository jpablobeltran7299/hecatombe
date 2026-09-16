'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProductosPorIds, urlFor } from '@/lib/sanity'
import { resolverItemsPedidos } from '@/lib/pedidos'
import { BODEGA_THRESHOLD_MXN, COSTO_ENVIO_MXN } from '@/lib/constants'
import EstadoBadge from '@/app/components/EstadoBadge'
import PedidoItemsList from '@/app/components/PedidoItemsList'
import BodegaProgress from '@/app/components/BodegaProgress'
import HecacoinsEarnedNote from '@/app/components/HecacoinsEarnedNote'
import FormDireccion from '@/app/components/FormDireccion'

export default function CuentaPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favoritos, setFavoritos] = useState([])
  const [productosF, setProductosF] = useState({})
  const [pedidos, setPedidos] = useState([])
  const [bodega, setBodega] = useState(null)
  const [pedidosBodega, setPedidosBodega] = useState([])
  const [hecacoins, setHecacoins] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [tab, setTab] = useState('perfil')
  const [perfil, setPerfil] = useState({
    nombre: '', apellido: '', telefono: '',
    calle: '', colonia: '', ciudad: '',
    estado: '', cp: '', referencias: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [direcciones, setDirecciones] = useState([])
  const [editandoDireccion, setEditandoDireccion] = useState(null)
  const [formDireccion, setFormDireccion] = useState(null)
  const [guardandoDireccion, setGuardandoDireccion] = useState(false)
  const MAX_DIRECCIONES = 3
  const DIRECCION_VACIA = { nombre: '', apellido: '', telefono: '', calle: '', colonia: '', ciudad: '', estado: '', cp: '', referencias: '' }
  const [liquidando, setLiquidando] = useState(null)
  const [destinoLiquidacion, setDestinoLiquidacion] = useState({})
  const [direccionLiquidacion, setDireccionLiquidacion] = useState({})
  const [confirmoLiquidacion, setConfirmoLiquidacion] = useState({})
  const [cotizacionLiquidacion, setCotizacionLiquidacion] = useState({})
  const [solicitandoEnvio, setSolicitandoEnvio] = useState(false)
  const [direccionBodega, setDireccionBodega] = useState(null)
  const [cotizacionBodega, setCotizacionBodega] = useState(null)
  const [tarifaBodega, setTarifaBodega] = useState(null)
  const [mostrarSolicitudBodega, setMostrarSolicitudBodega] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    if (['perfil', 'direcciones', 'favoritos', 'pedidos', 'bodega', 'hecacoins'].includes(tabParam)) setTab(tabParam)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else {
        setUser(session.user)
        cargarFavoritos(session.user.id)
        cargarPerfil(session.user.id)
        cargarDirecciones(session.user.id)
        cargarPedidos(session.user.id)
        cargarBodega(session.user.id)
        cargarHecacoins(session.user.id)
      }
      setLoading(false)
    })
  }, [])

  async function cargarPerfil(userId) {
    const { data } = await supabase
      .from('perfiles')
      .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
      .eq('user_id', userId)
      .single()
    if (data) setPerfil(data)
  }

  async function guardarPerfil() {
    setGuardando(true)
    setMensaje('')
    const { data: { session } } = await supabase.auth.getSession()
    const { data: existente } = await supabase.from('perfiles').select('id').eq('user_id', session.user.id).single()
    if (existente) {
      await supabase.from('perfiles').update(perfil).eq('user_id', session.user.id)
    } else {
      await supabase.from('perfiles').insert({ user_id: session.user.id, ...perfil })
    }
    setMensaje('¡Datos guardados correctamente!')
    setGuardando(false)
    setTimeout(() => setMensaje(''), 3000)
  }

  async function cargarDirecciones(userId) {
    const { data } = await supabase
      .from('direcciones')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    setDirecciones(data || [])
  }

  function iniciarNuevaDireccion() {
    setEditandoDireccion('nueva')
    setFormDireccion({ ...DIRECCION_VACIA, nombre: perfil.nombre, apellido: perfil.apellido, telefono: perfil.telefono })
  }

  function iniciarEditarDireccion(direccion) {
    setEditandoDireccion(direccion.id)
    setFormDireccion({ ...direccion })
  }

  function cancelarEdicionDireccion() {
    setEditandoDireccion(null)
    setFormDireccion(null)
  }

  async function guardarDireccion() {
    const requeridos = ['nombre', 'apellido', 'telefono', 'calle', 'colonia', 'ciudad', 'estado', 'cp']
    if (requeridos.some(k => !formDireccion[k]?.trim())) {
      setMensaje('Completa todos los campos obligatorios de la dirección.')
      setTimeout(() => setMensaje(''), 3000)
      return
    }
    setGuardandoDireccion(true)
    const { id, user_id, created_at, ...datos } = formDireccion
    if (editandoDireccion === 'nueva') {
      await supabase.from('direcciones').insert({ user_id: user.id, ...datos })
    } else {
      await supabase.from('direcciones').update(datos).eq('id', editandoDireccion)
    }
    await cargarDirecciones(user.id)
    setGuardandoDireccion(false)
    cancelarEdicionDireccion()
  }

  async function eliminarDireccion(id) {
    await supabase.from('direcciones').delete().eq('id', id)
    setDirecciones(prev => prev.filter(d => d.id !== id))
  }

  async function cargarFavoritos(userId) {
    const { data } = await supabase
      .from('favoritos')
      .select('producto_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    const favs = data || []
    setFavoritos(favs)
    if (favs.length > 0) {
      const ids = favs.map(f => f.producto_id)
      const productos = await getProductosPorIds(ids)
      const mapa = {}
      productos.forEach(p => { mapa[p._id] = p })
      setProductosF(mapa)
    }
  }

  async function cargarPedidos(userId) {
    const { data } = await supabase
      .from('pedidos')
      .select('id, created_at, total, estado, items, tipo_pedido, producto_id, anticipo_pagado, monto_liquidacion')
      .eq('user_id', userId)
      .not('destino', 'eq', 'bodega')
      .order('created_at', { ascending: false })
    const resueltos = await resolverItemsPedidos(data || [])
    setPedidos(resueltos)
  }

  async function cargarBodega(userId) {
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('id, created_at, total, items')
      .eq('user_id', userId)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'guardando')
      .order('created_at', { ascending: false })

    const piezas = pedidosData || []
    const totalAcumulado = piezas.reduce((acc, p) => acc + (p.total || 0), 0)
    const piezasResueltas = await resolverItemsPedidos(piezas)
    setBodega(piezas.length > 0 ? { total_acumulado: totalAcumulado } : null)
    setPedidosBodega(piezasResueltas)
  }

  async function cargarHecacoins(userId) {
    const { data: hc } = await supabase
      .from('hecacoins')
      .select('saldo, total_ganado, total_canjeado, vencimiento')
      .eq('user_id', userId)
      .single()
    setHecacoins(hc)

    const { data: mov } = await supabase
      .from('hecacoins_movimientos')
      .select('id, created_at, tipo, monto, descripcion')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    setMovimientos(mov || [])
  }

  async function cotizarLiquidacion(pedido, direccionId) {
    setCotizacionLiquidacion(prev => ({ ...prev, [pedido.id]: { cotizando: true, tarifas: [], tarifaId: null, error: '' } }))
    try {
      const res = await fetch('/api/cotizar-envio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          direccionId,
          items: [{ productoId: pedido.producto_id, cantidad: 1 }],
        }),
      })
      const data = await res.json()
      if (data.tarifas?.length > 0) {
        setCotizacionLiquidacion(prev => ({ ...prev, [pedido.id]: { cotizando: false, tarifas: data.tarifas, quotationId: data.quotationId, tarifaId: null, error: '' } }))
      } else {
        setCotizacionLiquidacion(prev => ({ ...prev, [pedido.id]: { cotizando: false, tarifas: [], tarifaId: null, error: data.error || 'No encontramos paqueterías disponibles para esa dirección.' } }))
      }
    } catch {
      setCotizacionLiquidacion(prev => ({ ...prev, [pedido.id]: { cotizando: false, tarifas: [], tarifaId: null, error: 'No se pudo cotizar el envío. Intenta de nuevo.' } }))
    }
  }

  async function handleLiquidar(pedido, destino) {
    const cotizacion = cotizacionLiquidacion[pedido.id]
    const envioGratisLiquidacion = ((pedido.anticipo_pagado || 0) + (pedido.monto_liquidacion || 0)) >= BODEGA_THRESHOLD_MXN
    if (destino !== 'bodega') {
      if (!direccionLiquidacion[pedido.id]) {
        setMensaje('Elige una dirección de envío para liquidar este pedido.')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
      if (!envioGratisLiquidacion && !cotizacion?.tarifaId) {
        setMensaje('Elige una paquetería para tu envío.')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
      if (!confirmoLiquidacion[pedido.id]) {
        setMensaje('Confirma que la dirección es correcta antes de pagar.')
        setTimeout(() => setMensaje(''), 3000)
        return
      }
    }

    setLiquidando(pedido.id)
    try {
      const itemLiquidar = {
        productoId: pedido.producto_id,
        nombre: `Liquidación pedido #${pedido.id}`,
        precio: pedido.monto_liquidacion,
        imagen: null,
        cantidad: 1,
        tipo: 'liquidacion'
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [itemLiquidar],
          userId: user.id,
          userEmail: user.email,
          tipo_pedido: 'liquidacion',
          destino,
          direccion_id: destino !== 'bodega' ? direccionLiquidacion[pedido.id] : null,
          quotation_id: destino !== 'bodega' ? cotizacion?.quotationId : null,
          rate_id: destino !== 'bodega' ? cotizacion?.tarifaId : null,
          producto_id: pedido.producto_id,
          pedido_id: pedido.id,
        }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } catch (err) {
      console.error(err)
    }
    setLiquidando(null)
  }

  async function elegirDireccionBodega(direccionId) {
    setDireccionBodega(direccionId)
    setTarifaBodega(null)
    setCotizacionBodega({ cotizando: true })
    const res = await fetch('/api/cotizar-envio-bodega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, direccionId }),
    })
    const data = await res.json()
    setCotizacionBodega({ cotizando: false, ...data })
  }

  async function handleSolicitarEnvio() {
    if (!direccionBodega) {
      setMensaje('Elige una dirección de envío.')
      setTimeout(() => setMensaje(''), 3000)
      return
    }
    if (!cotizacionBodega?.envioGratis && !tarifaBodega) {
      setMensaje('Elige una paquetería para adelantar tu envío.')
      setTimeout(() => setMensaje(''), 3000)
      return
    }

    setSolicitandoEnvio(true)
    try {
      const res = await fetch('/api/solicitar-envio-bodega', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          direccionId: direccionBodega,
          quotation_id: cotizacionBodega?.envioGratis ? null : cotizacionBodega?.quotationId,
          rate_id: cotizacionBodega?.envioGratis ? null : tarifaBodega,
        }),
      })
      const data = await res.json()
      if (data.init_point) {
        window.location.href = data.init_point
      } else if (data.ok) {
        setMensaje('✅ Solicitud enviada — te avisaremos cuando tu envío esté en camino.')
        setMostrarSolicitudBodega(false)
        setDireccionBodega(null)
        setCotizacionBodega(null)
        setTarifaBodega(null)
        cargarBodega(user.id)
        setTimeout(() => setMensaje(''), 4000)
      } else {
        setMensaje(data.error || 'No se pudo solicitar el envío.')
        setTimeout(() => setMensaje(''), 4000)
      }
    } catch (err) {
      console.error(err)
      setMensaje('No se pudo solicitar el envío. Intenta de nuevo.')
      setTimeout(() => setMensaje(''), 4000)
    }
    setSolicitandoEnvio(false)
  }

  async function eliminarFavorito(productoId) {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('favoritos').delete()
      .eq('user_id', session.user.id)
      .eq('producto_id', productoId)
    setFavoritos(prev => prev.filter(f => f.producto_id !== productoId))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const totalBodega = bodega?.total_acumulado || 0
  const faltaBodega = Math.max(0, BODEGA_THRESHOLD_MXN - totalBodega)
  const saldoHC = hecacoins?.saldo || 0

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink/50">Cargando...</p>
    </main>
  )

  const inputClass = "w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink/20 focus:outline-none focus:border-orange-500 transition"
  const labelClass = "text-ink/50 text-xs font-black uppercase tracking-widest mb-2 block"

  return (
    <main className="min-h-screen bg-page px-4 py-12">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase text-ink">Mi cuenta</h1>
          <button onClick={handleLogout} className="text-ink/50 hover:text-orange-600 text-sm transition">
            Cerrar sesión
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-line">
          {[
            { key: 'perfil', label: 'Perfil' },
            { key: 'direcciones', label: `Direcciones (${direcciones.length})` },
            { key: 'favoritos', label: `Favoritos (${favoritos.length})` },
            { key: 'pedidos', label: `Pedidos (${pedidos.length})` },
            { key: 'bodega', label: `📦 Bodega${totalBodega > 0 ? ` $${totalBodega.toLocaleString('es-MX')}` : ''}` },
            { key: 'hecacoins', label: `🪙 ${saldoHC > 0 ? `${saldoHC.toLocaleString('es-MX')} HC` : 'Hecacoins'}` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-black uppercase tracking-widest transition border-b-2 -mb-px whitespace-nowrap ${
                tab === key ? 'border-orange-500 text-orange-500' : 'border-transparent text-ink/40 hover:text-ink'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-4">Cuenta</h2>
              <p className="text-ink/70 text-sm">Correo: <span className="text-ink">{user?.email}</span></p>
              <p className="text-ink/70 text-sm mt-1">Miembro desde: <span className="text-ink">{new Date(user?.created_at).toLocaleDateString('es-MX')}</span></p>
            </div>
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Datos personales</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input type="text" value={perfil.nombre} onChange={e => setPerfil({ ...perfil, nombre: e.target.value })} placeholder="Tu nombre" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apellido</label>
                  <input type="text" value={perfil.apellido} onChange={e => setPerfil({ ...perfil, apellido: e.target.value })} placeholder="Tu apellido" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Teléfono</label>
                  <input type="tel" value={perfil.telefono} onChange={e => setPerfil({ ...perfil, telefono: e.target.value })} placeholder="Tu número de teléfono" className={inputClass} />
                </div>
              </div>
            </div>
            {mensaje && <p className="text-green-400 text-sm font-bold">{mensaje}</p>}
            <button onClick={guardarPerfil} disabled={guardando}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-xl transition w-full sm:w-auto sm:px-8">
              {guardando ? 'Guardando...' : 'Guardar datos'}
            </button>
          </div>
        )}

        {/* Tab: Direcciones */}
        {tab === 'direcciones' && (
          <div className="flex flex-col gap-4">
            {mensaje && <p className="text-green-400 text-sm font-bold">{mensaje}</p>}

            {direcciones.map(d => (
              <div key={d.id} className="bg-surface border border-line rounded-2xl p-6">
                {editandoDireccion === d.id ? (
                  <FormDireccion
                    form={formDireccion} setForm={setFormDireccion}
                    onGuardar={guardarDireccion} onCancelar={cancelarEdicionDireccion}
                    guardando={guardandoDireccion} inputClass={inputClass} labelClass={labelClass}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-ink font-black text-sm">{d.nombre} {d.apellido} <span className="text-ink/30 font-normal">· {d.telefono}</span></p>
                      <p className="text-ink/50 text-sm mt-1">{d.calle}, {d.colonia}, {d.ciudad}, {d.estado} CP {d.cp}</p>
                      {d.referencias && <p className="text-ink/30 text-xs mt-1">{d.referencias}</p>}
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                      <button onClick={() => iniciarEditarDireccion(d)} className="text-orange-600 hover:underline text-xs font-black uppercase">Editar</button>
                      <button onClick={() => eliminarDireccion(d.id)} className="text-ink/30 hover:text-red-400 text-xs font-black uppercase">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {editandoDireccion === 'nueva' && (
              <div className="bg-surface border border-line rounded-2xl p-6">
                <FormDireccion
                  form={formDireccion} setForm={setFormDireccion}
                  onGuardar={guardarDireccion} onCancelar={cancelarEdicionDireccion}
                  guardando={guardandoDireccion} inputClass={inputClass} labelClass={labelClass}
                />
              </div>
            )}

            {direcciones.length === 0 && editandoDireccion !== 'nueva' && (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center">
                <p className="text-ink/40 mb-2">No tienes direcciones guardadas</p>
                <p className="text-ink/20 text-sm mb-6">Agrega una para elegirla rápido al pagar</p>
              </div>
            )}

            {direcciones.length < MAX_DIRECCIONES && editandoDireccion === null && (
              <button onClick={iniciarNuevaDireccion}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-xl transition w-full sm:w-auto sm:px-8">
                + Agregar dirección
              </button>
            )}
            {direcciones.length >= MAX_DIRECCIONES && (
              <p className="text-ink/30 text-xs">Máximo {MAX_DIRECCIONES} direcciones guardadas. Elimina una para agregar otra.</p>
            )}
          </div>
        )}

        {/* Tab: Favoritos */}
        {tab === 'favoritos' && (
          <div>
            {favoritos.length === 0 ? (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center">
                <p className="text-ink/40 mb-4">No tienes favoritos guardados</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition">Ver catálogo</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoritos.map(f => {
                  const p = productosF[f.producto_id]
                  return (
                    <div key={f.producto_id} className="bg-surface border border-line rounded-2xl p-4 flex items-center gap-4">
                      {p?.imagenes?.[0] ? (
                        <img src={urlFor(p.imagenes[0]).width(80).height(80).url()} alt={p.nombre} className="w-16 h-16 object-contain rounded-lg bg-white flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-surface-alt rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-black uppercase text-xs truncate">{p?.nombre || 'Cargando...'}</p>
                        {p?.precio && <p className="text-orange-600 font-black text-sm">${p.precio.toLocaleString('es-MX')} MXN</p>}
                        <p className="text-ink/20 text-xs mt-1">{new Date(f.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link href={`/producto/${f.producto_id}`} className="text-orange-600 hover:underline text-xs font-black uppercase">Ver</Link>
                        <button onClick={() => eliminarFavorito(f.producto_id)} className="text-ink/20 hover:text-red-400 transition">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Pedidos */}
        {tab === 'pedidos' && (
          <div className="flex flex-col gap-4">
            {mensaje && <p className="text-green-400 text-sm font-bold">{mensaje}</p>}
            {pedidos.length === 0 ? (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center">
                <p className="text-ink/40 mb-2">No tienes pedidos aún</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition mt-4 inline-block">Ver catálogo</Link>
              </div>
            ) : (
              pedidos.map(pedido => (
                <div key={pedido.id} className="bg-surface border border-line rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-ink font-black uppercase text-sm">Pedido #{pedido.id}</p>
                      <p className="text-ink/30 text-xs mt-1">{new Date(pedido.created_at).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <EstadoBadge estado={pedido.estado} />
                      <span className="text-orange-600 font-black">${pedido.total?.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>
                  {pedido.estado === 'apartado' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
                      <p className="text-orange-400 text-xs font-black uppercase mb-2">Preventa apartada</p>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink/50">Anticipo pagado</span>
                        <span className="text-ink">${pedido.anticipo_pagado?.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <div className="flex justify-between text-xs mb-3">
                        <span className="text-ink/50">Pendiente de liquidar</span>
                        <span className="text-orange-400 font-black">${pedido.monto_liquidacion?.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <p className="text-ink/30 text-xs mb-3">Te avisaremos por correo cuando tu producto llegue.</p>

                      <p className="text-ink/50 text-xs font-black uppercase mb-2">¿Cómo quieres recibirlo?</p>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => setDestinoLiquidacion(prev => ({ ...prev, [pedido.id]: 'directo' }))}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs font-black uppercase py-2 rounded-lg border-2 transition ${
                            (destinoLiquidacion[pedido.id] || 'directo') === 'directo'
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-line text-ink/40 hover:border-ink/30'
                          }`}>
                          🚚 Envío directo
                        </button>
                        <button onClick={() => setDestinoLiquidacion(prev => ({ ...prev, [pedido.id]: 'bodega' }))}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs font-black uppercase py-2 rounded-lg border-2 transition ${
                            destinoLiquidacion[pedido.id] === 'bodega'
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-line text-ink/40 hover:border-ink/30'
                          }`}>
                          📦 Guardar en bodega
                        </button>
                      </div>

                      {(destinoLiquidacion[pedido.id] || 'directo') === 'directo' && (
                        <div className="mb-3">
                          {direcciones.length === 0 ? (
                            <div className="bg-page rounded-lg p-3 text-center">
                              <p className="text-ink/40 text-xs mb-2">No tienes direcciones guardadas.</p>
                              <button onClick={() => setTab('direcciones')} className="text-orange-600 hover:underline text-xs font-black uppercase">Agregar dirección</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col gap-2 mb-2">
                                {direcciones.map(d => (
                                  <button key={d.id}
                                    onClick={() => {
                                      setDireccionLiquidacion(prev => ({ ...prev, [pedido.id]: d.id }))
                                      setConfirmoLiquidacion(prev => ({ ...prev, [pedido.id]: false }))
                                      const valorTotalPedido = (pedido.anticipo_pagado || 0) + (pedido.monto_liquidacion || 0)
                                      if (valorTotalPedido < BODEGA_THRESHOLD_MXN) cotizarLiquidacion(pedido, d.id)
                                    }}
                                    className={`text-left p-3 rounded-lg border-2 transition ${direccionLiquidacion[pedido.id] === d.id ? 'border-orange-500 bg-orange-500/10' : 'border-line text-ink/40 hover:border-ink/30'}`}>
                                    <p className="text-ink text-xs font-black">{d.nombre} {d.apellido} <span className="text-ink/30 font-normal">· {d.telefono}</span></p>
                                    <p className="text-ink/40 text-xs mt-1">{d.calle}, {d.colonia}, {d.ciudad}, {d.estado} CP {d.cp}</p>
                                  </button>
                                ))}
                              </div>

                              {direccionLiquidacion[pedido.id] && ((pedido.anticipo_pagado || 0) + (pedido.monto_liquidacion || 0) >= BODEGA_THRESHOLD_MXN) && (
                                <p className="text-green-400 text-xs font-bold mb-3">✅ ¡Envío gratis! Este pedido supera $1,200 MXN</p>
                              )}

                              {direccionLiquidacion[pedido.id] && ((pedido.anticipo_pagado || 0) + (pedido.monto_liquidacion || 0) < BODEGA_THRESHOLD_MXN) && (
                                <div className="mb-3">
                                  {cotizacionLiquidacion[pedido.id]?.cotizando && <p className="text-ink/40 text-xs">Cotizando envío...</p>}
                                  {cotizacionLiquidacion[pedido.id]?.error && <p className="text-red-400 text-xs">{cotizacionLiquidacion[pedido.id].error}</p>}
                                  {cotizacionLiquidacion[pedido.id]?.tarifas?.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                      {cotizacionLiquidacion[pedido.id].tarifas.map(t => (
                                        <button key={t.rateId}
                                          onClick={() => setCotizacionLiquidacion(prev => ({ ...prev, [pedido.id]: { ...prev[pedido.id], tarifaId: t.rateId } }))}
                                          className={`flex items-center justify-between gap-2 text-left p-2 rounded-lg border-2 transition ${cotizacionLiquidacion[pedido.id]?.tarifaId === t.rateId ? 'border-orange-500 bg-orange-500/10' : 'border-line text-ink/40 hover:border-ink/30'}`}>
                                          <p className="text-ink text-xs font-black">{t.proveedor} <span className="text-ink/30 font-normal">· {t.servicio}</span></p>
                                          <span className="text-orange-600 font-black text-xs whitespace-nowrap">${t.total.toLocaleString('es-MX')}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {direccionLiquidacion[pedido.id] && (
                                <label className="flex items-start gap-2 cursor-pointer">
                                  <input type="checkbox" checked={!!confirmoLiquidacion[pedido.id]}
                                    onChange={e => setConfirmoLiquidacion(prev => ({ ...prev, [pedido.id]: e.target.checked }))}
                                    className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0" />
                                  <span className="text-ink text-xs font-bold">Confirmo que esta es la dirección correcta y es donde quiero recibir mi pedido.</span>
                                </label>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {(() => {
                        const destinoSel = destinoLiquidacion[pedido.id] || 'directo'
                        const cotizacion = cotizacionLiquidacion[pedido.id]
                        const envioGratisLiquidacion = ((pedido.anticipo_pagado || 0) + (pedido.monto_liquidacion || 0)) >= BODEGA_THRESHOLD_MXN
                        const tarifaSel = cotizacion?.tarifas?.find(t => t.rateId === cotizacion.tarifaId)
                        const costoEnvioLiquidacion = destinoSel !== 'bodega' && !envioGratisLiquidacion ? (tarifaSel?.total || 0) : 0
                        const totalLiquidar = (pedido.monto_liquidacion || 0) + costoEnvioLiquidacion
                        const requiereTarifa = destinoSel === 'directo' && !envioGratisLiquidacion
                        return (
                          <>
                            {costoEnvioLiquidacion > 0 && (
                              <p className="text-ink/30 text-xs mb-2">Incluye ${costoEnvioLiquidacion.toLocaleString('es-MX')} MXN de envío ({tarifaSel.proveedor})</p>
                            )}
                            <button onClick={() => handleLiquidar(pedido, destinoSel)}
                              disabled={liquidando === pedido.id || (destinoSel === 'directo' && (!direccionLiquidacion[pedido.id] || !confirmoLiquidacion[pedido.id] || (requiereTarifa && !cotizacion?.tarifaId)))}
                              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-2 rounded-lg text-sm transition">
                              {liquidando === pedido.id ? 'Procesando...' : `💳 Liquidar $${totalLiquidar.toLocaleString('es-MX')} MXN`}
                            </button>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  {pedido.lineas?.length > 0 && (
                    <div className="border-t border-line pt-4">
                      <PedidoItemsList lineas={pedido.lineas} size={56} />
                    </div>
                  )}
                  {(pedido.estado === 'pagado' || pedido.estado === 'liquidado') && (
                    <div className="border-t border-line pt-3 mt-3">
                      <HecacoinsEarnedNote pedido={pedido} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: Bodega */}
        {tab === 'bodega' && (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-2">Bodegatombe</h2>
              <p className="text-ink/40 text-sm mb-6">Acumula $1,200 MXN en compras y obtén envío gratis a todo México.</p>
              {mensaje && <p className="text-green-400 text-sm font-bold mb-4">{mensaje}</p>}
              {totalBodega > 0 ? (
                <>
                  <div className="mb-4">
                    <BodegaProgress total={totalBodega} />
                  </div>

                  {!mostrarSolicitudBodega ? (
                    <>
                      <button onClick={() => setMostrarSolicitudBodega(true)}
                        className={`w-full font-black uppercase py-4 rounded-xl transition text-sm ${faltaBodega === 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border border-orange-500 text-orange-500 hover:bg-orange-500/10'}`}>
                        {faltaBodega === 0 ? '🚚 Solicitar envío gratis' : '🚚 Solicitar envío ahora'}
                      </button>
                      {faltaBodega > 0 && (
                        <div className="text-ink/20 text-xs text-center mt-2">
                          <p>🚚 Envío desde ${COSTO_ENVIO_MXN}</p>
                          <p className="mt-1">📦 ¿Quieres ahorrártelo? Guarda tu pedido en <span className="font-black">Bodegatombe</span>, junta ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')} en compras y tu envío sale <span className="font-black">GRATIS</span></p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {direcciones.length === 0 ? (
                        <div className="bg-page rounded-lg p-3 text-center">
                          <p className="text-ink/40 text-xs mb-2">No tienes direcciones guardadas.</p>
                          <button onClick={() => setTab('direcciones')} className="text-orange-600 hover:underline text-xs font-black uppercase">Agregar dirección</button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {direcciones.map(d => (
                            <button key={d.id} onClick={() => elegirDireccionBodega(d.id)}
                              className={`text-left p-3 rounded-lg border-2 transition ${direccionBodega === d.id ? 'border-orange-500 bg-orange-500/10' : 'border-line text-ink/40 hover:border-ink/30'}`}>
                              <p className="text-ink text-xs font-black">{d.nombre} {d.apellido} <span className="text-ink/30 font-normal">· {d.telefono}</span></p>
                              <p className="text-ink/40 text-xs mt-1">{d.calle}, {d.colonia}, {d.ciudad}, {d.estado} CP {d.cp}</p>
                            </button>
                          ))}
                        </div>
                      )}

                      {cotizacionBodega?.cotizando && <p className="text-ink/40 text-xs">Cotizando envío...</p>}
                      {cotizacionBodega?.error && <p className="text-red-400 text-xs">{cotizacionBodega.error}</p>}

                      {cotizacionBodega?.envioGratis && (
                        <p className="text-green-400 text-xs font-bold">✅ ¡Tu envío es gratis! Hecatombe elegirá la paquetería y te avisaremos cuando esté en camino.</p>
                      )}

                      {cotizacionBodega?.tarifas?.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-ink/40 text-xs">Aún te faltan ${cotizacionBodega.falta?.toLocaleString('es-MX')} MXN para envío gratis — puedes pagar la tarifa real para adelantarlo:</p>
                          {cotizacionBodega.tarifas.map(t => (
                            <button key={t.rateId} onClick={() => setTarifaBodega(t.rateId)}
                              className={`flex items-center justify-between gap-2 text-left p-2 rounded-lg border-2 transition ${tarifaBodega === t.rateId ? 'border-orange-500 bg-orange-500/10' : 'border-line text-ink/40 hover:border-ink/30'}`}>
                              <p className="text-ink text-xs font-black">{t.proveedor} <span className="text-ink/30 font-normal">· {t.servicio}</span></p>
                              <span className="text-orange-600 font-black text-xs whitespace-nowrap">${t.total.toLocaleString('es-MX')}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 mt-2">
                        <button onClick={handleSolicitarEnvio} disabled={solicitandoEnvio}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-3 rounded-xl transition text-sm">
                          {solicitandoEnvio ? 'Procesando...' : cotizacionBodega?.tarifas?.length > 0 ? `💳 Pagar $${(cotizacionBodega.tarifas.find(t => t.rateId === tarifaBodega)?.total || 0).toLocaleString('es-MX')} y solicitar` : 'Confirmar solicitud'}
                        </button>
                        <button onClick={() => { setMostrarSolicitudBodega(false); setDireccionBodega(null); setCotizacionBodega(null); setTarifaBodega(null) }}
                          className="text-ink/40 hover:text-ink font-black uppercase py-3 px-4 rounded-xl transition text-sm">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-ink/30 text-4xl mb-4">📦</p>
                  <p className="text-ink/40 mb-2">Tu bodega está vacía</p>
                  <p className="text-ink/20 text-sm mb-6">Al comprar elige "Guardar en Bodegatombe" para acumular tu envío gratis</p>
                  <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition inline-block">Ver catálogo</Link>
                </div>
              )}
            </div>
            {pedidosBodega.length > 0 && (
              <div className="bg-surface border border-line rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-600 mb-1">Productos guardados</h2>
                <p className="text-ink/30 text-xs mb-4">Estos productos se envían juntos, gratis, al llegar a ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')} MXN.</p>
                <div className="flex flex-col gap-4">
                  {pedidosBodega.map(pedido => (
                    <div key={pedido.id} className="flex items-center justify-between gap-3 border-b border-ink/5 pb-4 last:border-0 last:pb-0">
                      <PedidoItemsList lineas={pedido.lineas} size={48} />
                      <span className="text-orange-600 font-black flex-shrink-0">${pedido.total?.toLocaleString('es-MX')} MXN</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Hecacoins */}
        {tab === 'hecacoins' && (
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-line rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black uppercase text-orange-600">Hecacoins</h2>
                  <p className="text-ink/40 text-sm mt-1">Ganas 3% de cada compra en Hecacoins. 1 HC = $1 MXN de descuento.</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-600 font-black text-3xl">{saldoHC.toLocaleString('es-MX')}</p>
                  <p className="text-ink/40 text-xs">HC disponibles</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-page rounded-xl p-4 text-center">
                  <p className="text-orange-600 font-black text-xl">{hecacoins?.total_ganado?.toLocaleString('es-MX') || 0}</p>
                  <p className="text-ink/30 text-xs mt-1 uppercase font-black">Total ganado</p>
                </div>
                <div className="bg-page rounded-xl p-4 text-center">
                  <p className="text-ink font-black text-xl">{saldoHC.toLocaleString('es-MX')}</p>
                  <p className="text-ink/30 text-xs mt-1 uppercase font-black">Disponible</p>
                </div>
                <div className="bg-page rounded-xl p-4 text-center">
                  <p className="text-ink/40 font-black text-xl">{hecacoins?.total_canjeado?.toLocaleString('es-MX') || 0}</p>
                  <p className="text-ink/30 text-xs mt-1 uppercase font-black">Canjeado</p>
                </div>
              </div>

              {hecacoins?.vencimiento && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-6">
                  <p className="text-yellow-400 text-xs font-black">⚠️ Tus Hecacoins vencen el 31 de diciembre de {new Date().getFullYear()}</p>
                </div>
              )}

              <Link href="/catalogo"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase py-3 rounded-xl transition text-center block text-sm">
                Usar Hecacoins en mi próxima compra →
              </Link>
            </div>

            {/* Historial */}
            {movimientos.length > 0 && (
              <div className="bg-surface border border-line rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-600 mb-4">Historial</h2>
                <div className="flex flex-col gap-3">
                  {movimientos.map(mov => (
                    <div key={mov.id} className="flex items-center justify-between border-b border-ink/5 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-ink text-sm font-black">{mov.descripcion}</p>
                        <p className="text-ink/30 text-xs">{new Date(mov.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <span className={`font-black text-sm ${mov.tipo === 'ganado' ? 'text-green-400' : 'text-orange-600'}`}>
                        {mov.tipo === 'ganado' ? '+' : '-'}{mov.monto?.toLocaleString('es-MX')} HC
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {movimientos.length === 0 && (
              <div className="bg-surface border border-line rounded-2xl p-12 text-center">
                <p className="text-ink/30 text-4xl mb-4">🪙</p>
                <p className="text-ink/40 mb-2">Aún no tienes Hecacoins</p>
                <p className="text-ink/20 text-sm mb-6">Gana 3% en cada compra automáticamente</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition inline-block">Ver catálogo</Link>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}
