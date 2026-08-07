'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminClientes() {
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [hecacoinsNuevas, setHecacoinsNuevas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.email !== 'hecatombe.9194@gmail.com') {
        router.push('/')
        return
      }
      cargarClientes()
    })
  }, [])

  async function cargarClientes() {
    // Obtener perfiles con sus hecacoins
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

    // Combinar datos
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
      await supabase
        .from('hecacoins')
        .update({
          saldo: hcExistente.saldo + monto,
          total_ganado: hcExistente.total_ganado + monto,
          vencimiento,
        })
        .eq('user_id', clienteSeleccionado.user_id)
    } else {
      await supabase
        .from('hecacoins')
        .insert({
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
    cargarClientes()
    setGuardando(false)
  }

  async function asignarBodega(monto) {
    if (!clienteSeleccionado || !monto) return
    setGuardando(true)

    const bodegaExistente = clienteSeleccionado.bodega

    if (bodegaExistente) {
      await supabase
        .from('bodega')
        .update({ total_acumulado: bodegaExistente.total_acumulado + parseFloat(monto) })
        .eq('user_id', clienteSeleccionado.user_id)
        .eq('estado', 'guardando')
    } else {
      await supabase
        .from('bodega')
        .insert({
          user_id: clienteSeleccionado.user_id,
          total_acumulado: parseFloat(monto),
          estado: 'guardando',
        })
    }

    setMensaje(`✅ $${monto} MXN agregados a Bodegatombe`)
    cargarClientes()
    setGuardando(false)
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellido?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda)
  )

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
                onClick={() => { setClienteSeleccionado(cliente); setMensaje('') }}
                className={`text-left bg-[#111] border rounded-2xl p-4 transition ${
                  clienteSeleccionado?.user_id === cliente.user_id
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-white/10 hover:border-white/30'
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-black text-sm">
                    {cliente.nombre || 'Sin nombre'} {cliente.apellido || ''}
                  </p>
                  <span className="text-orange-500 font-black text-xs">
                    {cliente.pedidos.count} pedidos
                  </span>
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

          {/* Panel de edición */}
          {clienteSeleccionado ? (
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-8 self-start">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">
                {clienteSeleccionado.nombre || 'Cliente'} {clienteSeleccionado.apellido || ''}
              </h2>

              {mensaje && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
                  <p className="text-green-400 text-sm">{mensaje}</p>
                </div>
              )}

              {/* Hecacoins */}
              <div className="mb-6">
                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Hecacoins</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-orange-500 font-black text-2xl">{clienteSeleccionado.hecacoins?.saldo?.toLocaleString('es-MX') || 0} HC</p>
                  <p className="text-white/30 text-xs mt-1">Ganado total: {clienteSeleccionado.hecacoins?.total_ganado?.toLocaleString('es-MX') || 0} HC</p>
                </div>
                <div className="flex gap-2">
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
              </div>

              {/* Bodega */}
              <div>
                <h3 className="text-white/50 text-xs font-black uppercase mb-3">Bodegatombe</h3>
                <div className="bg-black rounded-xl p-4 mb-3">
                  <p className="text-blue-400 font-black text-2xl">${clienteSeleccionado.bodega?.total_acumulado?.toLocaleString('es-MX') || 0} MXN</p>
                  <p className="text-white/30 text-xs mt-1">de $1,200 para envío gratis</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="bodegaMonto"
                    placeholder="Monto a agregar"
                    className="flex-1 bg-black border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => asignarBodega(document.getElementById('bodegaMonto').value)}
                    disabled={guardando}
                    className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-black uppercase text-xs px-4 py-2 rounded-lg transition">
                    Agregar
                  </button>
                </div>
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