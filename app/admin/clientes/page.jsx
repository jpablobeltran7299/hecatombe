'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getTodosProductos, urlFor } from '@/lib/sanity'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminClientes() {
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [hecacoinsNuevas, setHecacoinsNuevas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || !ADMINS.includes(session.user.email)) {
        router.push('/')
        return
      }
      cargarDatos()
    })
  }, [])

  async function cargarDatos() {
    const [, productosData] = await Promise.all([
      cargarClientes(),
      getTodosProductos()
    ])
    setProductos(productosData)
  }

  async function cargarClientes() {
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('user_id, nombre, apellido, telefono')

    const { data: hecacoinsData } = await supabase
      .from('hecacoins')
      .select('user_id, saldo, total_ganado, total_canjeado, vencimiento')

    const { data: bodegaData } = await supabase
      .from('bodega')
      .select('user_id, total_acumulado, estado')
      .eq('estado', 'guardando')

    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select('user_id, total, estado')

    const hcMap = {}
    hecacoinsData?.forEach(h => { hcMap[h.user_id] = h })

    const bodegaMap = {}
    bodegaData?.forEach(b => { bodegaMap[b.user_id] = b })

    const pedidosMap = {}
    pedidosData?.forEach(p => {
      if (!pedidosMap[p.user_id]) pedidosMap[p.user_id] = { count: 0, total: 0 }
      pedidosMap[p.user_id].count++
      if (['pagado', 'enviado', 'entregado'].includes(p.estado)) {
        pedidosMap[p.user_id].total += p.total || 0
      }
    })

    const clientesCombinados = (perfiles || []).map(p => ({
      ...p,
      hecacoins: hcMap[p.user_id] || null,
      bodega: bodegaMap[p.user_id] || null,
      pedidos: pedidosMap[p.user_id] || { count: 0, total: 0 },
    }))

    setClientes(clientesCombinados)
    setLoading(false)
    return clientesCombinados
  }

  async function asignarHecacoins() {
    if (!clienteSeleccionado || !hecacoinsNuevas) return
    setGuardando(true)
    setMensaje('')

    const monto = parseFloat(hecacoinsNuevas)
    const añoActual = new Date().getFullYear()
    const vencimiento = `${añoActual}-12-31`
    const hcExistente = clienteSeleccionado.hecacoins

    if (hcExistente) {
      await supabase.from('hecacoins').update({
        saldo: hcExistente.saldo + monto,
        total_ganado: hcExistente.total_ganado + monto,
        vencimiento,
      }).eq('user_id', clienteSeleccionado.user_id)
    } else {
      await supabase.from('hecacoins').insert({
        user_id: clienteSeleccionado.user_id,
        saldo: monto,
        total_ganado: monto,
        total_canjeado: 0,
        vencimiento,
      })
    }

    await supabase.from('hecacoins_movimientos').insert({
      user_id: clienteSeleccionado.user_id,
      tipo: 'ganado',
      monto,
      descripcion: 'Asignación manual por admin',
    })

    setMensaje(`✅ ${monto} Hecacoins asignadas correctamente`)
    setHecacoinsNuevas('')
    await cargarClientes()
    setGuardando(false)
  }

  async function agregarProductoBodega(producto) {
    if (!clienteSeleccionado) return
    setGuardando(true)
    setMensaje('')

    const precio = producto.precio || 0
    const bodegaExistente = clienteSeleccionado.bodega

    // Crear pedido en bodega
    await supabase.from('pedidos').insert({
      user_id: clienteSeleccionado.user_id,
      total: precio,
      estado: 'en_bodega',
      tipo_pedido: 'en_bodega',
      producto_id: producto._id,
      items: [{ producto_id: producto._id, cantidad: 1 }],
    })

    // Actualizar total en bodega
    if (bodegaExistente) {
      await supabase.from('bodega').update({
        total_acumulado: bodegaExistente.total_acumulado + precio
      }).eq('user_id', clienteSeleccionado.user_id).eq('estado', 'guardando')
    } else {
      await supabase.from('bodega').insert({
        user_id: clienteSeleccionado.user_id,
        total_acumulado: precio,
        estado: 'guardando',
      })
    }

    setMensaje(`✅ "${producto.nombre}" agregado a la bodega de ${clienteSeleccionado.nombre || 'cliente'}`)
    setBusquedaProducto('')
    await cargarClientes()
    setGuardando(false)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
  )

  const productosFiltrados = productos.filter(p =>
    busquedaProducto.length >= 2 &&
    p.nombre?.toLowerCase().includes(busquedaProducto.toLowerCase())
  ).slice(0, 6)

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando clientes...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-8">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <a href="/admin" className="text-white/40 hover:text-orange-500 transition text-sm">← Admin</a>
          <h1 className="text-2xl font-black uppercase text-white">Clientes</h1>
          <span className="text-white/30 text-sm">{clientes.length} registrados</span>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o teléfono..."
          className="w-full max-w-md bg-[#111] border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 text-sm mb-6"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Lista clientes */}
          <div className="flex flex-col gap-3">
            {clientesFiltrados.map(cliente => (
              <button key={cliente.user_id}
                onClick={() => { setClienteSeleccionado(cliente); setMensaje(''); setBusquedaProducto('') }}
                className={`text-left bg-[#111] border rounded-2xl p-4 transition ${
                  clienteSeleccionado?.user_id === cliente.user_id
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-white/10 hover:border-white/30'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-black text-sm">
                    {cliente.nombre || 'Sin nombre'} {cliente.apellido || ''}
                  </p>
                  <span className="text-orange-500 font-black text-xs">{cliente.pedidos.count} pedidos</span>
                </div>
                <div className="flex gap-4 text-xs text-white/30">
                  <span>🪙 {cliente.hecacoins?.saldo?.toLocaleString('es-MX') || 0} HC</span>
                  <span>📦 ${cliente.bodega?.total_acumulado?.toLocaleString('es-MX') || 0} bodega</span>
                  <span>💰 ${cliente.pedidos.total?.toLocaleString('es-MX') || 0} total</span>
                </div>
              </button>
            ))}

            {clientesFiltrados.length === 0 && (
              <p className="text-white/30 text-center py-8">No hay clientes registrados</p>
            )}
          </div>

          {/* Panel edición */}
          {clienteSeleccionado ? (
            <div className="flex flex-col gap-4">

              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-2">
                  {clienteSeleccionado.nombre || 'Cliente'} {clienteSeleccionado.apellido || ''}
                </h2>
                <p className="text-white/30 text-xs mb-4">{clienteSeleccionado.telefono || 'Sin teléfono'}</p>

                {mensaje && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                    <p className="text-green-400 text-sm">{mensaje}</p>
                  </div>
                )}

                {/* Hecacoins */}
                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Hecacoins</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-orange-500 font-black text-2xl">{clienteSeleccionado.hecacoins?.saldo?.toLocaleString('es-MX') || 0} HC</p>
                  <p className="text-white/30 text-xs mt-1">Ganado total: {clienteSeleccionado.hecacoins?.total_ganado?.toLocaleString('es-MX') || 0} HC</p>
                </div>
                <div className="flex gap-2 mb-6">
                  <input
                    type="number"
                    value={hecacoinsNuevas}
                    onChange={e => setHecacoinsNuevas(e.target.value)}
                    placeholder="Cantidad a agregar"
                    className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <button onClick={asignarHecacoins} disabled={guardando || !hecacoinsNuevas}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                    Agregar
                  </button>
                </div>

                {/* Bodega */}
                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Bodegatombe</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-blue-400 font-black text-2xl">${clienteSeleccionado.bodega?.total_acumulado?.toLocaleString('es-MX') || 0} MXN</p>
                  <p className="text-white/30 text-xs mt-1">de $1,200 para envío gratis</p>
                </div>

                {/* Buscar producto para bodega */}
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaProducto}
                    onChange={e => setBusquedaProducto(e.target.value)}
                    placeholder="Buscar producto para agregar a bodega..."
                    className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-white/20"
                  />
                  {productosFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl mt-1 z-10 overflow-hidden">
                      {productosFiltrados.map(p => (
                        <button
                          key={p._id}
                          onClick={() => agregarProductoBodega(p)}
                          disabled={guardando}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left border-b border-white/5 last:border-0">
                          {p.imagenes?.[0] ? (
                            <img src={urlFor(p.imagenes[0]).width(40).height(40).url()}
                              alt={p.nombre}
                              className="w-8 h-8 object-contain rounded bg-white flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 bg-[#222] rounded flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-black truncate">{p.nombre}</p>
                            <p className="text-orange-500 text-xs">${p.precio?.toLocaleString('es-MX') || '—'} MXN</p>
                          </div>
                          <span className="text-orange-500 text-xs font-black flex-shrink-0">+ Agregar</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-white/20 text-xs mt-2">Escribe al menos 2 letras para buscar</p>
              </div>

            </div>
          ) : (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/30">Selecciona un cliente para editar sus datos</p>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}