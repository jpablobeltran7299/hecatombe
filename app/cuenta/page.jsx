'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProductosPorIds, urlFor } from '@/lib/sanity'

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
  const [liquidando, setLiquidando] = useState(null)
  const [destinoLiquidacion, setDestinoLiquidacion] = useState({})
  const [solicitandoEnvio, setSolicitandoEnvio] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else {
        setUser(session.user)
        cargarFavoritos(session.user.id)
        cargarPerfil(session.user.id)
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
    setPedidos(data || [])
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
    setBodega(piezas.length > 0 ? { total_acumulado: totalAcumulado } : null)
    setPedidosBodega(piezas)
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

  async function handleLiquidar(pedido, destino) {
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
          producto_id: pedido.producto_id,
        }),
      })
      const data = await res.json()
      if (data.init_point) window.location.href = data.init_point
    } catch (err) {
      console.error(err)
    }
    setLiquidando(null)
  }

  async function handleSolicitarEnvio() {
    setSolicitandoEnvio(true)
    const msg = `Hola, quiero solicitar el envío de mis productos en Bodegatombe. Mi correo es ${user?.email}. Total acumulado: $${bodega?.total_acumulado?.toLocaleString('es-MX')} MXN`
    window.open(`https://wa.me/524427183787?text=${encodeURIComponent(msg)}`, '_blank')
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

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'pagado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
      case 'apartado': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
      case 'liquidado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
      default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
    }
  }

  const getLabelEstado = (estado) => {
    switch (estado) {
      case 'pagado': return '✅ Pagado'
      case 'apartado': return '🔒 Apartado'
      case 'liquidado': return '✅ Liquidado'
      default: return estado
    }
  }

  const totalBodega = bodega?.total_acumulado || 0
  const faltaBodega = Math.max(0, 1200 - totalBodega)
  const porcentajeBodega = Math.min(100, (totalBodega / 1200) * 100)
  const saldoHC = hecacoins?.saldo || 0

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"

  return (
    <main className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase text-white">Mi cuenta</h1>
          <button onClick={handleLogout} className="text-white/50 hover:text-orange-500 text-sm transition">
            Cerrar sesión
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10">
          {[
            { key: 'perfil', label: 'Perfil' },
            { key: 'favoritos', label: `Favoritos (${favoritos.length})` },
            { key: 'pedidos', label: `Pedidos (${pedidos.length})` },
            { key: 'bodega', label: `📦 Bodega${totalBodega > 0 ? ` $${totalBodega.toLocaleString('es-MX')}` : ''}` },
            { key: 'hecacoins', label: `🪙 ${saldoHC > 0 ? `${saldoHC.toLocaleString('es-MX')} HC` : 'Hecacoins'}` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-black uppercase tracking-widest transition border-b-2 -mb-px whitespace-nowrap ${
                tab === key ? 'border-orange-500 text-orange-500' : 'border-transparent text-white/40 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div className="flex flex-col gap-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Cuenta</h2>
              <p className="text-white/70 text-sm">Correo: <span className="text-white">{user?.email}</span></p>
              <p className="text-white/70 text-sm mt-1">Miembro desde: <span className="text-white">{new Date(user?.created_at).toLocaleDateString('es-MX')}</span></p>
            </div>
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Datos personales</h2>
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
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Dirección de envío</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Calle y número</label>
                  <input type="text" value={perfil.calle} onChange={e => setPerfil({ ...perfil, calle: e.target.value })} placeholder="Ej. Av. Constituyentes 123" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Colonia</label>
                  <input type="text" value={perfil.colonia} onChange={e => setPerfil({ ...perfil, colonia: e.target.value })} placeholder="Nombre de tu colonia" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input type="text" value={perfil.ciudad} onChange={e => setPerfil({ ...perfil, ciudad: e.target.value })} placeholder="Tu ciudad" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estado</label>
                  <input type="text" value={perfil.estado} onChange={e => setPerfil({ ...perfil, estado: e.target.value })} placeholder="Tu estado" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Código postal</label>
                  <input type="text" value={perfil.cp} onChange={e => setPerfil({ ...perfil, cp: e.target.value })} placeholder="CP" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Referencias <span className="text-white/20 normal-case font-normal">(opcional)</span></label>
                  <textarea value={perfil.referencias} onChange={e => setPerfil({ ...perfil, referencias: e.target.value })} placeholder="Ej. Casa azul, entre Calle 5 y Calle 6, portón negro" rows={2} className={`${inputClass} resize-none`} />
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

        {/* Tab: Favoritos */}
        {tab === 'favoritos' && (
          <div>
            {favoritos.length === 0 ? (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-white/40 mb-4">No tienes favoritos guardados</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition">Ver catálogo</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoritos.map(f => {
                  const p = productosF[f.producto_id]
                  return (
                    <div key={f.producto_id} className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                      {p?.imagenes?.[0] ? (
                        <img src={urlFor(p.imagenes[0]).width(80).height(80).url()} alt={p.nombre} className="w-16 h-16 object-contain rounded-lg bg-white flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black uppercase text-xs truncate">{p?.nombre || 'Cargando...'}</p>
                        {p?.precio && <p className="text-orange-500 font-black text-sm">${p.precio.toLocaleString('es-MX')} MXN</p>}
                        <p className="text-white/20 text-xs mt-1">{new Date(f.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link href={`/producto/${f.producto_id}`} className="text-orange-500 hover:underline text-xs font-black uppercase">Ver</Link>
                        <button onClick={() => eliminarFavorito(f.producto_id)} className="text-white/20 hover:text-red-400 transition">
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
            {pedidos.length === 0 ? (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-white/40 mb-2">No tienes pedidos aún</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition mt-4 inline-block">Ver catálogo</Link>
              </div>
            ) : (
              pedidos.map(pedido => (
                <div key={pedido.id} className="bg-[#111] border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white font-black uppercase text-sm">Pedido #{pedido.id}</p>
                      <p className="text-white/30 text-xs mt-1">{new Date(pedido.created_at).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${getBadgeEstado(pedido.estado)}`}>
                        {getLabelEstado(pedido.estado)}
                      </span>
                      <span className="text-orange-500 font-black">${pedido.total?.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>
                  {pedido.estado === 'apartado' && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 mb-4">
                      <p className="text-orange-400 text-xs font-black uppercase mb-2">Preventa apartada</p>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/50">Anticipo pagado</span>
                        <span className="text-white">${pedido.anticipo_pagado?.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <div className="flex justify-between text-xs mb-3">
                        <span className="text-white/50">Pendiente de liquidar</span>
                        <span className="text-orange-400 font-black">${pedido.monto_liquidacion?.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <p className="text-white/30 text-xs mb-3">Te avisaremos por correo cuando tu producto llegue.</p>

                      <p className="text-white/50 text-xs font-black uppercase mb-2">¿Cómo quieres recibirlo?</p>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => setDestinoLiquidacion(prev => ({ ...prev, [pedido.id]: 'directo' }))}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs font-black uppercase py-2 rounded-lg border-2 transition ${
                            (destinoLiquidacion[pedido.id] || 'directo') === 'directo'
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-white/10 text-white/40 hover:border-white/30'
                          }`}>
                          🚚 Envío directo
                        </button>
                        <button onClick={() => setDestinoLiquidacion(prev => ({ ...prev, [pedido.id]: 'bodega' }))}
                          className={`flex-1 flex items-center justify-center gap-1 text-xs font-black uppercase py-2 rounded-lg border-2 transition ${
                            destinoLiquidacion[pedido.id] === 'bodega'
                              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                              : 'border-white/10 text-white/40 hover:border-white/30'
                          }`}>
                          📦 Guardar en bodega
                        </button>
                      </div>

                      <button onClick={() => handleLiquidar(pedido, destinoLiquidacion[pedido.id] || 'directo')} disabled={liquidando === pedido.id}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-2 rounded-lg text-sm transition">
                        {liquidando === pedido.id ? 'Procesando...' : `💳 Liquidar $${pedido.monto_liquidacion?.toLocaleString('es-MX')} MXN`}
                      </button>
                    </div>
                  )}
                  {pedido.items?.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-white/30 text-xs uppercase font-black">{pedido.items.length} producto(s)</p>
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
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-2">Bodegatombe</h2>
              <p className="text-white/40 text-sm mb-6">Acumula $1,200 MXN en compras y obtén envío gratis a todo México.</p>
              {totalBodega > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/50 text-xs font-black uppercase">Acumulado</span>
                    <span className="text-orange-500 font-black">${totalBodega.toLocaleString('es-MX')} / $1,200 MXN</span>
                  </div>
                  <div className="w-full bg-[#222] rounded-full h-3 mb-4">
                    <div className="bg-orange-500 h-3 rounded-full transition-all duration-500" style={{ width: `${porcentajeBodega}%` }} />
                  </div>
                  {faltaBodega > 0 ? (
                    <p className="text-white/40 text-sm mb-6">Te faltan <span className="text-orange-500 font-black">${faltaBodega.toLocaleString('es-MX')} MXN</span> para envío gratis.</p>
                  ) : (
                    <p className="text-green-400 text-sm font-black mb-6">🎉 ¡Ya tienes envío gratis disponible!</p>
                  )}
                  <button onClick={handleSolicitarEnvio} disabled={solicitandoEnvio}
                    className={`w-full font-black uppercase py-4 rounded-xl transition text-sm ${faltaBodega === 0 ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'border border-orange-500 text-orange-500 hover:bg-orange-500/10'}`}>
                    {solicitandoEnvio ? 'Procesando...' : faltaBodega === 0 ? '🚚 Solicitar envío gratis' : '🚚 Solicitar envío ahora'}
                  </button>
                  {faltaBodega > 0 && <p className="text-white/20 text-xs text-center mt-2">Si solicitas envío antes de $1,200 se cobrará el costo de envío</p>}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-white/30 text-4xl mb-4">📦</p>
                  <p className="text-white/40 mb-2">Tu bodega está vacía</p>
                  <p className="text-white/20 text-sm mb-6">Al comprar elige "Guardar en Bodegatombe" para acumular tu envío gratis</p>
                  <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition inline-block">Ver catálogo</Link>
                </div>
              )}
            </div>
            {pedidosBodega.length > 0 && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Productos guardados</h2>
                <div className="flex flex-col gap-3">
                  {pedidosBodega.map(pedido => (
                    <div key={pedido.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-white text-sm font-black">Pedido #{pedido.id}</p>
                        <p className="text-white/30 text-xs">{new Date(pedido.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <span className="text-orange-500 font-black">${pedido.total?.toLocaleString('es-MX')} MXN</span>
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
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-black uppercase text-orange-500">Hecacoins</h2>
                  <p className="text-white/40 text-sm mt-1">Ganas 3% de cada compra en Hecacoins. 1 HC = $1 MXN de descuento.</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-500 font-black text-3xl">{saldoHC.toLocaleString('es-MX')}</p>
                  <p className="text-white/40 text-xs">HC disponibles</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-black rounded-xl p-4 text-center">
                  <p className="text-orange-500 font-black text-xl">{hecacoins?.total_ganado?.toLocaleString('es-MX') || 0}</p>
                  <p className="text-white/30 text-xs mt-1 uppercase font-black">Total ganado</p>
                </div>
                <div className="bg-black rounded-xl p-4 text-center">
                  <p className="text-white font-black text-xl">{saldoHC.toLocaleString('es-MX')}</p>
                  <p className="text-white/30 text-xs mt-1 uppercase font-black">Disponible</p>
                </div>
                <div className="bg-black rounded-xl p-4 text-center">
                  <p className="text-white/40 font-black text-xl">{hecacoins?.total_canjeado?.toLocaleString('es-MX') || 0}</p>
                  <p className="text-white/30 text-xs mt-1 uppercase font-black">Canjeado</p>
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
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Historial</h2>
                <div className="flex flex-col gap-3">
                  {movimientos.map(mov => (
                    <div key={mov.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-white text-sm font-black">{mov.descripcion}</p>
                        <p className="text-white/30 text-xs">{new Date(mov.created_at).toLocaleDateString('es-MX')}</p>
                      </div>
                      <span className={`font-black text-sm ${mov.tipo === 'ganado' ? 'text-green-400' : 'text-orange-500'}`}>
                        {mov.tipo === 'ganado' ? '+' : '-'}{mov.monto?.toLocaleString('es-MX')} HC
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {movimientos.length === 0 && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-white/30 text-4xl mb-4">🪙</p>
                <p className="text-white/40 mb-2">Aún no tienes Hecacoins</p>
                <p className="text-white/20 text-sm mb-6">Gana 3% en cada compra automáticamente</p>
                <Link href="/catalogo" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition inline-block">Ver catálogo</Link>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  )
}