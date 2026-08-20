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
  const [hecacoinsRestar, setHecacoinsRestar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [pedidosBodega, setPedidosBodega] = useState([])
  const [historial, setHistorial] = useState([])
  const [mostrarFormHistorial, setMostrarFormHistorial] = useState(false)
  const [historialNombre, setHistorialNombre] = useState('')
  const [historialPrecio, setHistorialPrecio] = useState('')
  const [historialFecha, setHistorialFecha] = useState('')
  const [historialImagenUrl, setHistorialImagenUrl] = useState(null)
  const [subiendoImagenHistorial, setSubiendoImagenHistorial] = useState(false)
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
    const productosData = await getTodosProductos()
    setProductos(productosData)
    await cargarClientes()
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

  async function cargarPedidosBodega(userId) {
    const { data } = await supabase
      .from('pedidos')
      .select('id, total, created_at, items, producto_id')
      .eq('user_id', userId)
      .eq('estado', 'en_bodega')
      .order('created_at', { ascending: false })
    setPedidosBodega(data || [])
  }

  async function cargarHistorial(userId) {
    const res = await fetch(`/api/admin/historial?userId=${userId}`)
    const data = await res.json()
    setHistorial(data.ok ? data.historial : [])
  }

  async function seleccionarCliente(cliente) {
    setClienteSeleccionado(cliente)
    setMensaje('')
    setBusquedaProducto('')
    setHecacoinsNuevas('')
    setHecacoinsRestar('')
    setMostrarFormHistorial(false)
    setHistorialNombre('')
    setHistorialPrecio('')
    setHistorialFecha('')
    setHistorialImagenUrl(null)
    await cargarPedidosBodega(cliente.user_id)
    await cargarHistorial(cliente.user_id)
  }

  async function subirImagenHistorial(file) {
    setSubiendoImagenHistorial(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (data.url) setHistorialImagenUrl(data.url)
    setSubiendoImagenHistorial(false)
  }

  async function agregarHistorial() {
    if (!clienteSeleccionado || !historialNombre || !historialFecha) return
    setGuardando(true)
    setMensaje('')

    const res = await fetch('/api/admin/historial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: clienteSeleccionado.user_id,
        productoNombre: historialNombre,
        productoImagen: historialImagenUrl,
        precio: historialPrecio,
        fechaCompra: historialFecha,
      })
    })
    const data = await res.json()
    if (data.ok) {
      setMensaje(`✅ "${historialNombre}" agregado al historial`)
      setHistorialNombre('')
      setHistorialPrecio('')
      setHistorialFecha('')
      setHistorialImagenUrl(null)
      setMostrarFormHistorial(false)
      await cargarHistorial(clienteSeleccionado.user_id)
    } else {
      setMensaje('❌ Error al agregar al historial')
    }
    setGuardando(false)
  }

  async function eliminarHistorial(id, nombre) {
    if (!confirm(`¿Eliminar "${nombre}" del historial?`)) return
    setGuardando(true)
    setMensaje('')

    const res = await fetch('/api/admin/historial', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    if (data.ok) {
      setMensaje('✅ Eliminado del historial')
      await cargarHistorial(clienteSeleccionado.user_id)
    } else {
      setMensaje('❌ Error al eliminar del historial')
    }
    setGuardando(false)
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

    setMensaje(`✅ ${monto} Hecacoins asignadas`)
    setHecacoinsNuevas('')
    const clientes = await cargarClientes()
    const actualizado = clientes.find(c => c.user_id === clienteSeleccionado.user_id)
    if (actualizado) setClienteSeleccionado(actualizado)
    setGuardando(false)
  }

  async function restarHecacoins() {
    if (!clienteSeleccionado || !hecacoinsRestar) return
    setGuardando(true)
    setMensaje('')

    const monto = parseFloat(hecacoinsRestar)
    const hcExistente = clienteSeleccionado.hecacoins
    if (!hcExistente) { setMensaje('❌ El cliente no tiene Hecacoins'); setGuardando(false); return }

    const nuevoSaldo = Math.max(0, hcExistente.saldo - monto)
    await supabase.from('hecacoins').update({
      saldo: nuevoSaldo,
      total_canjeado: hcExistente.total_canjeado + monto,
    }).eq('user_id', clienteSeleccionado.user_id)

    await supabase.from('hecacoins_movimientos').insert({
      user_id: clienteSeleccionado.user_id,
      tipo: 'canjeado',
      monto,
      descripcion: 'Ajuste manual por admin',
    })

    setMensaje(`✅ ${monto} Hecacoins descontadas`)
    setHecacoinsRestar('')
    const clientes = await cargarClientes()
    const actualizado = clientes.find(c => c.user_id === clienteSeleccionado.user_id)
    if (actualizado) setClienteSeleccionado(actualizado)
    setGuardando(false)
  }

  async function agregarProductoBodega(producto) {
    if (!clienteSeleccionado) return
    setGuardando(true)
    setMensaje('')

    const precio = producto.precio || 0

    const { data: pedidoCreado, error: errorPedido } = await supabase.from('pedidos').insert({
      user_id: clienteSeleccionado.user_id,
      total: precio,
      estado: 'en_bodega',
      tipo_pedido: 'en_bodega',
      producto_id: producto._id,
      items: [{ producto_id: producto._id, cantidad: 1 }],
    }).select().single()

    if (errorPedido) {
      setMensaje('❌ Error al crear el pedido')
      setGuardando(false)
      return
    }

    const { data: bodegaRows } = await supabase
      .from('bodega')
      .select('pedido_id, total_acumulado')
      .eq('user_id', clienteSeleccionado.user_id)
      .eq('estado', 'guardando')

    const bodegaExistente = bodegaRows?.[0] || null

    if (bodegaExistente) {
      await supabase.from('bodega').update({
        total_acumulado: bodegaExistente.total_acumulado + precio
      }).eq('pedido_id', bodegaExistente.pedido_id)
    } else {
      await supabase.from('bodega').insert({
        user_id: clienteSeleccionado.user_id,
        pedido_id: pedidoCreado.id,
        total_acumulado: precio,
        estado: 'guardando',
      })
    }

    setMensaje(`✅ "${producto.nombre}" agregado a bodega`)
    setBusquedaProducto('')
    await cargarPedidosBodega(clienteSeleccionado.user_id)
    const clientes = await cargarClientes()
    const actualizado = clientes.find(c => c.user_id === clienteSeleccionado.user_id)
    if (actualizado) setClienteSeleccionado(actualizado)
    setGuardando(false)
  }

  async function eliminarDeBodega(pedidoId, total) {
    if (!confirm('¿Eliminar este producto de la bodega?')) return
    setGuardando(true)

    await supabase.from('pedidos').delete().eq('id', pedidoId)

    const { data: bodegaRows } = await supabase
      .from('bodega')
      .select('pedido_id, total_acumulado')
      .eq('user_id', clienteSeleccionado.user_id)
      .eq('estado', 'guardando')

    const bodegaExistente = bodegaRows?.[0] || null

    if (bodegaExistente) {
      const nuevoTotal = Math.max(0, bodegaExistente.total_acumulado - total)
      if (nuevoTotal === 0) {
        await supabase.from('bodega').delete().eq('pedido_id', bodegaExistente.pedido_id)
      } else {
        await supabase.from('bodega').update({
          total_acumulado: nuevoTotal
        }).eq('pedido_id', bodegaExistente.pedido_id)
      }
    }

    setMensaje('✅ Producto eliminado de bodega')
    await cargarPedidosBodega(clienteSeleccionado.user_id)
    const clientes = await cargarClientes()
    const actualizado = clientes.find(c => c.user_id === clienteSeleccionado.user_id)
    if (actualizado) setClienteSeleccionado(actualizado)
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

  function getNombreProducto(productoId) {
    const p = productos.find(x => x._id === productoId)
    return p?.nombre || `Producto ${productoId?.slice(-6)}`
  }

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

          <div className="flex flex-col gap-3 max-h-screen overflow-y-auto">
            {clientesFiltrados.map(cliente => (
              <button key={cliente.user_id}
                onClick={() => seleccionarCliente(cliente)}
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

          {clienteSeleccionado ? (
            <div className="flex flex-col gap-4">

              {mensaje && (
                <div className={`border rounded-xl p-3 ${mensaje.startsWith('❌') ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                  <p className={`text-sm ${mensaje.startsWith('❌') ? 'text-red-400' : 'text-green-400'}`}>{mensaje}</p>
                </div>
              )}

              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-1">
                  {clienteSeleccionado.nombre || 'Cliente'} {clienteSeleccionado.apellido || ''}
                </h2>
                <p className="text-white/30 text-xs mb-6">{clienteSeleccionado.telefono || 'Sin teléfono'}</p>

                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Hecacoins</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-orange-500 font-black text-2xl">{clienteSeleccionado.hecacoins?.saldo?.toLocaleString('es-MX') || 0} HC</p>
                  <p className="text-white/30 text-xs mt-1">Ganado total: {clienteSeleccionado.hecacoins?.total_ganado?.toLocaleString('es-MX') || 0} HC</p>
                </div>

                <p className="text-white/30 text-xs mb-1">Agregar Hecacoins</p>
                <div className="flex gap-2 mb-3">
                  <input type="number" value={hecacoinsNuevas} onChange={e => setHecacoinsNuevas(e.target.value)}
                    placeholder="Cantidad a agregar"
                    className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
                  <button onClick={asignarHecacoins} disabled={guardando || !hecacoinsNuevas}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                    + Agregar
                  </button>
                </div>

                <p className="text-white/30 text-xs mb-1">Quitar Hecacoins</p>
                <div className="flex gap-2 mb-6">
                  <input type="number" value={hecacoinsRestar} onChange={e => setHecacoinsRestar(e.target.value)}
                    placeholder="Cantidad a quitar"
                    className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500" />
                  <button onClick={restarHecacoins} disabled={guardando || !hecacoinsRestar}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                    - Quitar
                  </button>
                </div>

                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Bodegatombe</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-blue-400 font-black text-2xl">${clienteSeleccionado.bodega?.total_acumulado?.toLocaleString('es-MX') || 0} MXN</p>
                  <p className="text-white/30 text-xs mt-1">de $1,200 para envío gratis</p>
                </div>

                {pedidosBodega.length > 0 && (
                  <div className="mb-3">
                    <p className="text-white/30 text-xs uppercase font-black mb-2">Productos guardados ({pedidosBodega.length})</p>
                    <div className="flex flex-col gap-2">
                      {pedidosBodega.map(pedido => (
                        <div key={pedido.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-3 py-2">
                          <div>
                            <p className="text-white text-xs font-black">{getNombreProducto(pedido.producto_id)}</p>
                            <p className="text-orange-500 text-xs">${pedido.total?.toLocaleString('es-MX')} MXN</p>
                          </div>
                          <button onClick={() => eliminarDeBodega(pedido.id, pedido.total)} disabled={guardando}
                            className="text-white/20 hover:text-red-400 transition text-xs disabled:opacity-30">
                            🗑
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-white/30 text-xs mb-1">Agregar producto a bodega</p>
                <div className="relative">
                  <input type="text" value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-white/20" />
                  {productosFiltrados.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl mt-1 z-10 overflow-hidden">
                      {productosFiltrados.map(p => (
                        <button key={p._id} onClick={() => agregarProductoBodega(p)} disabled={guardando}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left border-b border-white/5 last:border-0">
                          {p.imagenes?.[0] ? (
                            <img src={urlFor(p.imagenes[0]).width(40).height(40).url()} alt={p.nombre}
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
                <p className="text-white/20 text-xs mt-1">Escribe al menos 2 letras para buscar</p>

                <h3 className="text-white/50 text-xs font-black uppercase mb-3 mt-6">Historial de compras</h3>
                {historial.length > 0 ? (
                  <div className="flex flex-col gap-2 mb-3">
                    {historial.map(h => (
                      <div key={h.id} className="flex items-center gap-3 bg-black rounded-lg px-3 py-2">
                        {h.producto_imagen ? (
                          <img src={h.producto_imagen} alt={h.producto_nombre}
                            className="w-8 h-8 object-contain rounded bg-white flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 bg-[#1a1a1a] rounded flex-shrink-0 flex items-center justify-center text-sm">🎁</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-black truncate">{h.producto_nombre}</p>
                          <p className="text-white/30 text-xs">
                            {h.fecha_compra}{h.origen === 'manual' ? ' · manual' : ''}
                          </p>
                        </div>
                        {h.precio != null && (
                          <span className="text-orange-500 text-xs font-black flex-shrink-0">
                            ${Number(h.precio).toLocaleString('es-MX')}
                          </span>
                        )}
                        <button onClick={() => eliminarHistorial(h.id, h.producto_nombre)} disabled={guardando}
                          className="text-white/20 hover:text-red-400 transition text-xs disabled:opacity-30 flex-shrink-0">
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/20 text-xs mb-3">Sin compras registradas</p>
                )}

                {mostrarFormHistorial ? (
                  <div className="bg-black rounded-xl p-3 flex flex-col gap-2">
                    <input type="text" value={historialNombre} onChange={e => setHistorialNombre(e.target.value)}
                      placeholder="Nombre del producto"
                      className="bg-[#111] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-white/20" />
                    <div className="flex gap-2">
                      <input type="number" value={historialPrecio} onChange={e => setHistorialPrecio(e.target.value)}
                        placeholder="Precio"
                        className="flex-1 bg-[#111] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-white/20" />
                      <input type="date" value={historialFecha} onChange={e => setHistorialFecha(e.target.value)}
                        className="flex-1 bg-[#111] border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="file" accept="image/*"
                        onChange={e => e.target.files[0] && subirImagenHistorial(e.target.files[0])}
                        className="flex-1 text-white/50 text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-orange-500 file:text-black file:font-black file:text-xs file:uppercase cursor-pointer" />
                      {subiendoImagenHistorial && <span className="text-orange-500 text-xs flex-shrink-0">Subiendo...</span>}
                      {historialImagenUrl && !subiendoImagenHistorial && (
                        <img src={historialImagenUrl} alt="" className="w-8 h-8 object-contain rounded bg-white flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={agregarHistorial} disabled={guardando || !historialNombre || !historialFecha}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                        {guardando ? 'Guardando...' : '✅ Guardar'}
                      </button>
                      <button onClick={() => setMostrarFormHistorial(false)}
                        className="text-white/30 hover:text-white text-xs font-black uppercase px-3 py-2">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setMostrarFormHistorial(true)}
                    className="w-full border border-white/10 hover:border-orange-500 text-white/40 hover:text-orange-500 text-xs font-black uppercase px-4 py-2 rounded-lg transition">
                    + Agregar al historial
                  </button>
                )}
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