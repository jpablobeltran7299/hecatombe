'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminPedidos() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [pedidos, setPedidos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [actualizando, setActualizando] = useState(null)
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (!user || !ADMINS.includes(user.email)) {
      router.push('/')
      return
    }
    cargarPedidos()
  }, [authLoading, user])

  async function cargarPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('id, created_at, total, estado, tipo_pedido, destino, bodega_estado, mp_payment_id, anticipo_pagado, monto_liquidacion, user_id')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  async function cambiarEstado(pedidoId, nuevoEstado) {
    setActualizando(pedidoId)
    await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', pedidoId)
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p))
    setActualizando(null)
  }

  const getBadge = (estado) => {
    switch (estado) {
      case 'pagado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
      case 'apartado': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
      case 'enviado': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
      case 'entregado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
      case 'cancelado': return 'bg-red-500/10 text-red-400 border border-red-500/30'
      default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
    }
  }

  const pedidosFiltrados = pedidos.filter(p => {
    const matchBusqueda = String(p.id).includes(busqueda) || p.mp_payment_id?.includes(busqueda)
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchBusqueda && matchEstado
  })

  const totalVentas = pedidos
    .filter(p => p.estado === 'pagado' || p.estado === 'enviado' || p.estado === 'entregado')
    .reduce((acc, p) => acc + (p.total || 0), 0)

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando pedidos...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Pedidos</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total pedidos', value: pedidos.length },
            { label: 'Ventas confirmadas', value: pedidos.filter(p => ['pagado','enviado','entregado'].includes(p.estado)).length },
            { label: 'Apartados', value: pedidos.filter(p => p.estado === 'apartado').length },
            { label: 'En bodega', value: pedidos.filter(p => p.destino === 'bodega' && p.bodega_estado === 'guardando').length, href: '/admin/bodega' },
          ].map(({ label, value, href }) => {
            const contenido = (
              <>
                <p className="text-orange-500 font-black text-2xl">{value}</p>
                <p className="text-white/30 text-xs uppercase font-black mt-1">{label}</p>
              </>
            )
            return href ? (
              <Link key={label} href={href} className="bg-[#111] border border-white/10 hover:border-orange-500 rounded-2xl p-4 text-center transition">
                {contenido}
              </Link>
            ) : (
              <div key={label} className="bg-[#111] border border-white/10 rounded-2xl p-4 text-center">
                {contenido}
              </div>
            )
          })}
        </div>

        <div className="bg-[#111] border border-white/10 rounded-xl px-6 py-4 mb-6 flex items-center justify-between">
          <p className="text-white/50 text-sm font-black uppercase">Total en ventas confirmadas</p>
          <p className="text-orange-500 font-black text-2xl">${totalVentas.toLocaleString('es-MX')} MXN</p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por # pedido o ID MP..."
            className="flex-1 min-w-[200px] bg-[#111] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm"
          />
          {['todos', 'pagado', 'apartado', 'enviado', 'entregado', 'cancelado'].map(estado => (
            <button key={estado} onClick={() => setFiltroEstado(estado)}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition ${
                filtroEstado === estado ? 'bg-orange-500 text-black' : 'bg-[#111] text-white/40 hover:text-white border border-white/10'
              }`}>
              {estado}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {pedidosFiltrados.map(pedido => (
            <div key={pedido.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-white font-black text-sm">Pedido #{pedido.id}</p>
                  <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${getBadge(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                  {pedido.tipo_pedido && pedido.tipo_pedido !== 'normal' && (
                    <span className="text-xs text-white/30 uppercase font-black">{pedido.tipo_pedido}</span>
                  )}
                </div>
                <p className="text-white/30 text-xs">{new Date(pedido.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                {pedido.mp_payment_id && (
                  <p className="text-white/20 text-xs mt-1">MP: {pedido.mp_payment_id}</p>
                )}
              </div>

              <div className="text-right">
                <p className="text-orange-500 font-black text-lg">${pedido.total?.toLocaleString('es-MX')} MXN</p>
                {pedido.estado === 'apartado' && pedido.monto_liquidacion && (
                  <p className="text-white/30 text-xs">Pendiente: ${pedido.monto_liquidacion?.toLocaleString('es-MX')}</p>
                )}
              </div>

              <select
                value={pedido.estado}
                onChange={e => cambiarEstado(pedido.id, e.target.value)}
                disabled={actualizando === pedido.id}
                className="bg-black border border-white/20 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-orange-500 disabled:opacity-50">
                <option value="pagado">Pagado</option>
                <option value="apartado">Apartado</option>
                <option value="enviado">Enviado</option>
                <option value="entregado">Entregado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          ))}

          {pedidosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/30">No hay pedidos con ese filtro</p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}