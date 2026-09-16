'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AuthProvider'
import { ADMINS, BODEGA_THRESHOLD_MXN } from '@/lib/constants'
import { adminFetch } from '@/lib/adminFetch'
import { resolverItemsPedidos } from '@/lib/pedidos'
import PedidoItemsList from '@/app/components/PedidoItemsList'
import BodegaProgress from '@/app/components/BodegaProgress'

export default function AdminBodega() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bodegas, setBodegas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cotizando, setCotizando] = useState(null)
  const [tarifas, setTarifas] = useState({})
  const [tarifaSel, setTarifaSel] = useState({})
  const [generando, setGenerando] = useState(null)
  const [errorSolicitud, setErrorSolicitud] = useState({})
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarBodegas()
  }, [authLoading, user])

  async function cargarBodegas() {
    const { data: pedidosBodega } = await supabase
      .from('pedidos')
      .select('user_id, id, total, created_at, producto_id, items, bodega_estado, direccion_snapshot, envio_cotizacion, guia, bodega_tipo_solicitud')
      .eq('destino', 'bodega')
      .order('created_at', { ascending: false })

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('user_id, nombre, apellido, telefono')

    const perfilesMap = {}
    perfilesData?.forEach(p => { perfilesMap[p.user_id] = p })

    // resolverItemsPedidos entiende tanto `items` (compra normal, varios
    // productos) como `producto_id` (apartado/bodega de un solo producto).
    const pedidosResueltos = await resolverItemsPedidos(pedidosBodega || [])

    // Agrupar por usuario + bodega_estado (reemplaza a la antigua fila "bodega")
    const grupos = {}
    pedidosResueltos.forEach(pedido => {
      const key = `${pedido.user_id}|${pedido.bodega_estado}`
      if (!grupos[key]) {
        grupos[key] = {
          user_id: pedido.user_id,
          estado: pedido.bodega_estado,
          total_acumulado: 0,
          pedidos: [],
        }
      }
      grupos[key].total_acumulado += pedido.total || 0
      grupos[key].pedidos.push(pedido)
    })

    const bodegasCombinadas = Object.values(grupos).map(g => ({
      ...g,
      perfil: perfilesMap[g.user_id] || null,
    }))

    setBodegas(bodegasCombinadas)
    setLoading(false)
  }

  async function marcarEnviado(userId) {
    // Solo se actualiza bodega_estado (estado físico en la bodega).
    // No se toca `estado` (estado de pago del pedido: pagado/apartado/etc.)
    await supabase
      .from('pedidos')
      .update({ bodega_estado: 'enviado' })
      .eq('user_id', userId)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'guardando')

    cargarBodegas()
  }

  async function handleCotizar(userId) {
    setCotizando(userId)
    setErrorSolicitud(prev => ({ ...prev, [userId]: '' }))
    const res = await adminFetch('/api/admin/cotizar-envio-bodega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    const data = await res.json()
    if (data.tarifas) {
      setTarifas(prev => ({ ...prev, [userId]: { quotationId: data.quotationId, opciones: data.tarifas } }))
    } else {
      setErrorSolicitud(prev => ({ ...prev, [userId]: data.error || 'No se pudo cotizar.' }))
    }
    setCotizando(null)
  }

  async function handleGenerarGuiaBodega(userId) {
    setGenerando(userId)
    setErrorSolicitud(prev => ({ ...prev, [userId]: '' }))
    const res = await adminFetch('/api/admin/generar-envio-bodega', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        quotation_id: tarifas[userId]?.quotationId || null,
        rate_id: tarifaSel[userId] || null,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      cargarBodegas()
    } else {
      setErrorSolicitud(prev => ({ ...prev, [userId]: data.error || 'No se pudo generar la guía.' }))
    }
    setGenerando(null)
  }

  const bodegasFiltradas = bodegas.filter(b => {
    const nombre = `${b.perfil?.nombre || ''} ${b.perfil?.apellido || ''}`.toLowerCase()
    return nombre.includes((busqueda || '').toLowerCase())
  })

  const totalEnBodega = bodegas
    .filter(b => b.estado === 'guardando')
    .reduce((acc, b) => acc + (b.total_acumulado || 0), 0)

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando bodega...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-ink-muted hover:text-orange-600 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-ink">Bodegatombe</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface border border-line rounded-2xl p-4 text-center">
            <p className="text-orange-600 font-black text-2xl">{bodegas.filter(b => b.estado === 'guardando').length}</p>
            <p className="text-ink-muted text-xs uppercase font-black mt-1">Clientes en bodega</p>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-4 text-center">
            <p className="text-orange-600 font-black text-2xl">${totalEnBodega.toLocaleString('es-MX')}</p>
            <p className="text-ink-muted text-xs uppercase font-black mt-1">Total acumulado</p>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-4 text-center">
            <p className="text-orange-600 font-black text-2xl">{bodegas.filter(b => b.total_acumulado >= BODEGA_THRESHOLD_MXN).length}</p>
            <p className="text-ink-muted text-xs uppercase font-black mt-1">Listos para envío gratis</p>
          </div>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full max-w-md bg-surface border border-line-strong rounded-lg px-4 py-2 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 text-sm mb-6"
        />

        <div className="flex flex-col gap-4">
          {bodegasFiltradas.map((bodega, idx) => (
            <div key={`${bodega.user_id}-${idx}`} className="bg-surface border border-line rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-ink font-black text-sm">
                    {bodega.perfil?.nombre || 'Sin nombre'} {bodega.perfil?.apellido || ''}
                  </p>
                  <p className="text-ink-muted text-xs mt-1">{bodega.perfil?.telefono || 'Sin teléfono'}</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-600 font-black text-xl">${bodega.total_acumulado?.toLocaleString('es-MX')} MXN</p>
                  <p className="text-ink-muted text-xs">de ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')}</p>
                </div>
              </div>

              <div className="mb-4">
                <BodegaProgress total={bodega.total_acumulado} showLabel={false} showMensaje={false} height={8} />
              </div>

              {bodega.pedidos.length > 0 && (
                <div className="mb-4">
                  <p className="text-ink-muted text-xs uppercase font-black mb-2">{bodega.pedidos.length} pedido(s) guardados</p>
                  <div className="flex flex-col gap-3">
                    {bodega.pedidos.map(p => (
                      <div key={p.id} className="flex justify-between items-center gap-3 bg-page rounded-lg px-3 py-2">
                        <PedidoItemsList lineas={p.lineas} size={32} />
                        <span className="text-orange-600 font-black text-xs flex-shrink-0">${p.total?.toLocaleString('es-MX')} MXN</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                  bodega.estado === 'guardando'
                    ? bodega.total_acumulado >= BODEGA_THRESHOLD_MXN
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : bodega.estado === 'solicitado'
                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                }`}>
                  {bodega.estado === 'guardando'
                    ? bodega.total_acumulado >= BODEGA_THRESHOLD_MXN ? '✅ Listo para envío gratis' : '📦 Acumulando'
                    : bodega.estado === 'solicitado'
                    ? `📮 Solicitado (${bodega.pedidos[0]?.bodega_tipo_solicitud === 'pagado' ? 'pagado' : 'gratis'})`
                    : '🚚 Enviado'}
                </span>

                {bodega.estado === 'guardando' && (
                  <button
                    onClick={() => marcarEnviado(bodega.user_id)}
                    className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                    Marcar como enviado
                  </button>
                )}
              </div>

              {bodega.estado === 'solicitado' && (() => {
                const direccion = bodega.pedidos.find(p => p.direccion_snapshot)?.direccion_snapshot
                const yaCotizado = bodega.pedidos.find(p => p.envio_cotizacion?.rate_id)?.envio_cotizacion
                const opciones = tarifas[bodega.user_id]?.opciones
                return (
                  <div className="bg-page rounded-xl p-4">
                    {direccion && (
                      <p className="text-ink-muted text-xs mb-3">
                        📍 {direccion.calle}, {direccion.colonia}, {direccion.ciudad}, {direccion.estado} CP {direccion.cp}
                      </p>
                    )}

                    {yaCotizado ? (
                      <>
                        <p className="text-ink-muted text-xs mb-3">Tarifa ya elegida por el cliente: <span className="text-ink font-black">{yaCotizado.proveedor} · {yaCotizado.servicio} — ${yaCotizado.total?.toLocaleString('es-MX')} MXN</span></p>
                        <button onClick={() => handleGenerarGuiaBodega(bodega.user_id)} disabled={generando === bodega.user_id}
                          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                          {generando === bodega.user_id ? 'Generando guía...' : '📦 Generar guía de envío'}
                        </button>
                      </>
                    ) : opciones ? (
                      <>
                        <p className="text-ink-muted text-xs mb-2">Elige la paquetería para este envío:</p>
                        <div className="flex flex-col gap-2 mb-3">
                          {opciones.map(t => (
                            <button key={t.rateId} onClick={() => setTarifaSel(prev => ({ ...prev, [bodega.user_id]: t.rateId }))}
                              className={`flex items-center justify-between gap-2 text-left p-2 rounded-lg border-2 transition ${tarifaSel[bodega.user_id] === t.rateId ? 'border-orange-500 bg-orange-500/10' : 'border-line text-ink-muted hover:border-line-strong'}`}>
                              <p className="text-ink text-xs font-black">{t.proveedor} <span className="text-ink-muted font-normal">· {t.servicio}</span></p>
                              <span className="text-orange-600 font-black text-xs whitespace-nowrap">${t.total.toLocaleString('es-MX')} · {t.dias}d</span>
                            </button>
                          ))}
                        </div>
                        <button onClick={() => handleGenerarGuiaBodega(bodega.user_id)} disabled={!tarifaSel[bodega.user_id] || generando === bodega.user_id}
                          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                          {generando === bodega.user_id ? 'Generando guía...' : '📦 Generar guía de envío'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleCotizar(bodega.user_id)} disabled={cotizando === bodega.user_id}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                        {cotizando === bodega.user_id ? 'Cotizando...' : '💲 Cotizar envío'}
                      </button>
                    )}

                    {errorSolicitud[bodega.user_id] && <p className="text-red-400 text-xs mt-2">{errorSolicitud[bodega.user_id]}</p>}
                  </div>
                )
              })()}

              {bodega.estado === 'enviado' && bodega.pedidos.find(p => p.guia?.trackingNumber) && (() => {
                const guia = bodega.pedidos.find(p => p.guia?.trackingNumber).guia
                return (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-xs font-black uppercase">📦 Guía generada · {guia.proveedor}</p>
                    <p className="text-ink-muted text-xs mt-1">Rastreo: {guia.trackingNumber}</p>
                    {guia.labelUrl && <a href={guia.labelUrl} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-xs font-black uppercase mt-1 inline-block">Descargar guía →</a>}
                  </div>
                )
              })()}
            </div>
          ))}

          {bodegasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ink-muted">No hay productos en bodega</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}