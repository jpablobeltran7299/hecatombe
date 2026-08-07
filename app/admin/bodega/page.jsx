'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getProductosPorIds } from '@/lib/sanity'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminBodega() {
  const [loading, setLoading] = useState(true)
  const [bodegas, setBodegas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarBodegas()
    })
  }, [])

  async function cargarBodegas() {
    const { data: bodegaData } = await supabase
      .from('bodega')
      .select('id, user_id, total_acumulado, estado, created_at')
      .order('created_at', { ascending: false })

    const { data: perfilesData } = await supabase
      .from('perfiles')
      .select('user_id, nombre, apellido, telefono')

    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('user_id, id, total, created_at, items')
      .eq('estado', 'en_bodega')
      .order('created_at', { ascending: false })

    const perfilesMap = {}
    perfilesData?.forEach(p => { perfilesMap[p.user_id] = p })

    // Obtener todos los producto_ids de los items
    const todosLosIds = []
    pedidosData?.forEach(pedido => {
      pedido.items?.forEach(item => {
        if (item.producto_id && !todosLosIds.includes(item.producto_id)) {
          todosLosIds.push(item.producto_id)
        }
      })
    })

    // Traer nombres de productos desde Sanity
    const productosInfo = todosLosIds.length > 0 ? await getProductosPorIds(todosLosIds) : []
    const productosMap = {}
    productosInfo.forEach(p => { productosMap[p._id] = p })

    const pedidosMap = {}
    pedidosData?.forEach(pedido => {
      if (!pedidosMap[pedido.user_id]) pedidosMap[pedido.user_id] = []
      pedidosMap[pedido.user_id].push({
        ...pedido,
        productosDetalle: (pedido.items || []).map(item => ({
          ...item,
          nombre: productosMap[item.producto_id]?.nombre || `Producto #${item.producto_id}`,
        }))
      })
    })

    const bodegasCombinadas = (bodegaData || []).map(b => ({
      ...b,
      perfil: perfilesMap[b.user_id] || null,
      pedidos: pedidosMap[b.user_id] || [],
    }))

    setBodegas(bodegasCombinadas)
    setLoading(false)
  }

  async function marcarEnviado(userId) {
    await supabase
      .from('bodega')
      .update({ estado: 'enviado' })
      .eq('user_id', userId)
      .eq('estado', 'guardando')

    await supabase
      .from('pedidos')
      .update({ estado: 'enviado' })
      .eq('user_id', userId)
      .eq('estado', 'en_bodega')

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
          {bodegasFiltradas.map(bodega => (
            <div key={bodega.id} className="bg-[#111] border border-white/10 rounded-2xl p-6">
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

              {/* Pedidos con productos */}
              {bodega.pedidos.length > 0 && (
                <div className="mb-4">
                  <p className="text-white/30 text-xs uppercase font-black mb-2">{bodega.pedidos.length} pedido(s) guardados</p>
                  <div className="flex flex-col gap-3">
                    {bodega.pedidos.map(pedido => (
                      <div key={pedido.id} className="bg-black rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white/50 text-xs font-black">Pedido #{pedido.id}</span>
                          <span className="text-orange-500 font-black text-xs">${pedido.total?.toLocaleString('es-MX')} MXN</span>
                        </div>
                        {pedido.productosDetalle?.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {pedido.productosDetalle.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs text-white/40">
                                <span>{item.nombre}</span>
                                <span>x{item.cantidad || 1}</span>
                              </div>
                            ))}
                          </div>
                        )}
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