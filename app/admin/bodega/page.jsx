'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getProductosPorIds } from '@/lib/sanity'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminBodega() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bodegas, setBodegas] = useState([])
  const [busqueda, setBusqueda] = useState('')
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
      .select('user_id, id, total, created_at, producto_id, bodega_estado')
      .eq('destino', 'bodega')
      .order('created_at', { ascending: false })

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('user_id, nombre, apellido, telefono')

    const perfilesMap = {}
    perfilesData?.forEach(p => { perfilesMap[p.user_id] = p })

    const todosLosIds = []
    pedidosBodega?.forEach(pedido => {
      if (pedido.producto_id && !todosLosIds.includes(pedido.producto_id)) {
        todosLosIds.push(pedido.producto_id)
      }
    })

    const productosInfo = todosLosIds.length > 0 ? await getProductosPorIds(todosLosIds) : []
    const productosMap = {}
    productosInfo.forEach(p => { productosMap[p._id] = p })

    // Agrupar por usuario + bodega_estado (reemplaza a la antigua fila "bodega")
    const grupos = {}
    pedidosBodega?.forEach(pedido => {
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
      grupos[key].pedidos.push({
        ...pedido,
        nombreProducto: productosMap[pedido.producto_id]?.nombre || `Pedido #${pedido.id}`
      })
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

  const bodegasFiltradas = bodegas.filter(b => {
    const nombre = `${b.perfil?.nombre || ''} ${b.perfil?.apellido || ''}`.toLowerCase()
    return nombre.includes((busqueda || '').toLowerCase())
  })

  const totalEnBodega = bodegas
    .filter(b => b.estado === 'guardando')
    .reduce((acc, b) => acc + (b.total_acumulado || 0), 0)

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando bodega...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Bodegatombe</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-orange-500 font-black text-2xl">{bodegas.filter(b => b.estado === 'guardando').length}</p>
            <p className="text-white/30 text-xs uppercase font-black mt-1">Clientes en bodega</p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-orange-500 font-black text-2xl">${totalEnBodega.toLocaleString('es-MX')}</p>
            <p className="text-white/30 text-xs uppercase font-black mt-1">Total acumulado</p>
          </div>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-orange-500 font-black text-2xl">{bodegas.filter(b => b.total_acumulado >= 1200).length}</p>
            <p className="text-white/30 text-xs uppercase font-black mt-1">Listos para envío gratis</p>
          </div>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full max-w-md bg-[#111] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm mb-6"
        />

        <div className="flex flex-col gap-4">
          {bodegasFiltradas.map((bodega, idx) => (
            <div key={`${bodega.user_id}-${idx}`} className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white font-black text-sm">
                    {bodega.perfil?.nombre || 'Sin nombre'} {bodega.perfil?.apellido || ''}
                  </p>
                  <p className="text-white/30 text-xs mt-1">{bodega.perfil?.telefono || 'Sin teléfono'}</p>
                </div>
                <div className="text-right">
                  <p className="text-orange-500 font-black text-xl">${bodega.total_acumulado?.toLocaleString('es-MX')} MXN</p>
                  <p className="text-white/30 text-xs">de $1,200</p>
                </div>
              </div>

              <div className="w-full bg-[#222] rounded-full h-2 mb-4">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (bodega.total_acumulado / 1200) * 100)}%` }}
                />
              </div>

              {bodega.pedidos.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/30 text-xs uppercase font-black mb-2">{bodega.pedidos.length} producto(s) guardados</p>
                  <div className="flex flex-col gap-2">
                    {bodega.pedidos.map(p => (
                      <div key={p.id} className="flex justify-between items-center text-xs bg-black rounded-lg px-3 py-2">
                        <span className="text-white/70">{p.nombreProducto}</span>
                        <span className="text-orange-500 font-black">${p.total?.toLocaleString('es-MX')} MXN</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                  bodega.estado === 'guardando'
                    ? bodega.total_acumulado >= 1200
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                }`}>
                  {bodega.estado === 'guardando'
                    ? bodega.total_acumulado >= 1200 ? '✅ Listo para envío gratis' : '📦 Acumulando'
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
            </div>
          ))}

          {bodegasFiltradas.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30">No hay productos en bodega</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}