'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [items, setItems] = useState([])
  const [modoApartar, setModoApartar] = useState(false)
  const [itemApartar, setItemApartar] = useState(null)
  const [modoEnvio, setModoEnvio] = useState('inmediato')
  const [hecacoins, setHecacoins] = useState(0)
  const [usarHecacoins, setUsarHecacoins] = useState(false)
  const [direccion, setDireccion] = useState({
    nombre: '', apellido: '', telefono: '',
    calle: '', colonia: '', ciudad: '',
    estado: '', cp: '', referencias: ''
  })
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const modo = params.get('modo')

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
        .eq('user_id', session.user.id)
        .single()
      if (perfilData) setDireccion(perfilData)

      // Cargar saldo Hecacoins
      const { data: hc } = await supabase
        .from('hecacoins')
        .select('saldo, vencimiento')
        .eq('user_id', session.user.id)
        .single()

      if (hc) {
        const hoy = new Date()
        const vencimiento = new Date(hc.vencimiento)
        if (vencimiento >= hoy) setHecacoins(hc.saldo)
      }

      setLoading(false)
    })

    if (modo === 'apartar') {
      const apartar = JSON.parse(localStorage.getItem('apartar') || 'null')
      if (!apartar) { router.push('/catalogo'); return }
      setModoApartar(true)
      setItemApartar(apartar)
    } else {
      const carritoLocal = JSON.parse(localStorage.getItem('carrito') || '[]')
      if (carritoLocal.length === 0) { router.push('/carrito'); return }
      setItems(carritoLocal)
    }
  }, [])

  async function handlePagar() {
    setError('')

    if (modoEnvio === 'inmediato' || modoApartar) {
      const requeridos = ['nombre', 'apellido', 'telefono', 'calle', 'colonia', 'ciudad', 'estado', 'cp']
      const faltantes = requeridos.filter(k => !direccion[k]?.trim())
      if (faltantes.length > 0) { setError('Por favor completa todos los campos obligatorios.'); return }
    } else {
      if (!direccion.nombre?.trim() || !direccion.telefono?.trim()) {
        setError('Por favor ingresa tu nombre y teléfono.'); return
      }
    }

    setProcesando(true)

    const { data: existente } = await supabase.from('perfiles').select('id').eq('user_id', user.id).single()
    if (existente) {
      await supabase.from('perfiles').update(direccion).eq('user_id', user.id)
    } else {
      await supabase.from('perfiles').insert({ user_id: user.id, ...direccion })
    }

    try {
      const itemsAPagar = modoApartar
        ? [{ ...itemApartar, precio: itemApartar.anticipo, cantidad: 1 }]
        : items

      const tipoPedido = modoApartar ? 'apartado' : 'normal'
      const destino = modoEnvio === 'bodega' ? 'bodega' : 'directo'
      const hecacoinsACanjear = usarHecacoins && !modoApartar ? hecacoins : 0

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsAPagar,
          userId: user.id,
          userEmail: user.email,
          direccion,
          tipo_pedido: tipoPedido,
          destino,
          hecacoins_a_canjear: hecacoinsACanjear,
          ...(modoApartar && {
            producto_id: itemApartar.productoId,
            anticipo_pagado: itemApartar.anticipo,
            monto_liquidacion: itemApartar.precioLiquidacion,
          }),
        }),
      })

      const data = await res.json()

      // Si pagó todo con Hecacoins
      if (data.pago_completo_hecacoins) {
        window.location.href = '/carrito?estado=exitoso'
        return
      }

      if (data.init_point) {
        window.location.href = data.init_point
      } else {
        setError('Error al procesar el pago. Intenta de nuevo.')
      }
    } catch (err) {
      setError('Error al procesar el pago. Intenta de nuevo.')
    }

    setProcesando(false)
  }

  const totalBruto = modoApartar
    ? itemApartar?.anticipo || 0
    : items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)

  const descuentoHC = usarHecacoins && !modoApartar ? Math.min(hecacoins, totalBruto) : 0
  const totalFinal = totalBruto - descuentoHC
  const envioGratis = totalBruto >= 1200

  const inputClass = "w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-orange-500 transition"
  const labelClass = "text-white/50 text-xs font-black uppercase tracking-widest mb-2 block"

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black uppercase text-white mb-2">
          {modoApartar ? 'Apartar producto' : 'Confirmar pedido'}
        </h1>
        {modoApartar && (
          <p className="text-orange-500 text-sm mb-8">
            Pagas el anticipo ahora y liquidas el resto cuando llegue tu producto.
          </p>
        )}
        {!modoApartar && <div className="mb-8" />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Formulario */}
          <div className="flex flex-col gap-4">

            {/* Opción de envío */}
            {!modoApartar && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-4">¿Cómo quieres recibir tu pedido?</h2>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setModoEnvio('inmediato')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${modoEnvio === 'inmediato' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <span className="text-2xl mt-0.5">🚚</span>
                    <div>
                      <p className="text-white font-black uppercase text-sm">Envío inmediato</p>
                      <p className="text-white/40 text-xs mt-1">
                        {envioGratis ? '✅ ¡Envío gratis! Tu pedido supera $1,200 MXN' : 'Se coordina el envío al confirmar tu pago'}
                      </p>
                    </div>
                  </button>
                  <button onClick={() => setModoEnvio('bodega')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${modoEnvio === 'bodega' ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 hover:border-white/30'}`}>
                    <span className="text-2xl mt-0.5">📦</span>
                    <div>
                      <p className="text-white font-black uppercase text-sm">Guardar en Bodega</p>
                      <p className="text-white/40 text-xs mt-1">Acumula compras hasta $1,200 MXN y obtén envío gratis.</p>
                      {!envioGratis && (
                        <p className="text-orange-500 text-xs mt-1 font-bold">
                          Te faltan ${(1200 - totalBruto).toLocaleString('es-MX')} MXN para envío gratis
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Hecacoins */}
            {hecacoins > 0 && !modoApartar && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-500">Hecacoins</h2>
                    <p className="text-white/50 text-sm mt-1">
                      Tienes <span className="text-orange-500 font-black">{hecacoins.toLocaleString('es-MX')} HC</span> disponibles (= ${hecacoins.toLocaleString('es-MX')} MXN)
                    </p>
                  </div>
                  <button
                    onClick={() => setUsarHecacoins(!usarHecacoins)}
                    className={`w-12 h-6 rounded-full transition-colors ${usarHecacoins ? 'bg-orange-500' : 'bg-[#333]'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${usarHecacoins ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                {usarHecacoins && (
                  <p className="text-green-400 text-xs mt-3 font-bold">
                    ✅ Se descontarán ${descuentoHC.toLocaleString('es-MX')} MXN de tu total
                  </p>
                )}
              </div>
            )}

            {/* Datos personales */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Datos personales</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input type="text" value={direccion.nombre} onChange={e => setDireccion({ ...direccion, nombre: e.target.value })} placeholder="Nombre" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input type="text" value={direccion.apellido} onChange={e => setDireccion({ ...direccion, apellido: e.target.value })} placeholder="Apellido" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Teléfono *</label>
                  <input type="tel" value={direccion.telefono} onChange={e => setDireccion({ ...direccion, telefono: e.target.value })} placeholder="Tu número de teléfono" className={inputClass} />
                </div>
              </div>
            </div>

            {/* Dirección */}
            {(modoEnvio === 'inmediato' || modoApartar) && (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Dirección de envío</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Calle y número *</label>
                    <input type="text" value={direccion.calle} onChange={e => setDireccion({ ...direccion, calle: e.target.value })} placeholder="Ej. Av. Constituyentes 123" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Colonia *</label>
                    <input type="text" value={direccion.colonia} onChange={e => setDireccion({ ...direccion, colonia: e.target.value })} placeholder="Nombre de tu colonia" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ciudad *</label>
                    <input type="text" value={direccion.ciudad} onChange={e => setDireccion({ ...direccion, ciudad: e.target.value })} placeholder="Tu ciudad" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Estado *</label>
                    <input type="text" value={direccion.estado} onChange={e => setDireccion({ ...direccion, estado: e.target.value })} placeholder="Tu estado" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Código postal *</label>
                    <input type="text" value={direccion.cp} onChange={e => setDireccion({ ...direccion, cp: e.target.value })} placeholder="CP" className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Referencias <span className="text-white/20 normal-case font-normal">(opcional)</span></label>
                    <textarea value={direccion.referencias} onChange={e => setDireccion({ ...direccion, referencias: e.target.value })} placeholder="Ej. Casa azul, portón negro" rows={2} className={`${inputClass} resize-none`} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Resumen</h2>

              {modoApartar && itemApartar ? (
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    {itemApartar.imagen ? (
                      <img src={itemApartar.imagen} alt={itemApartar.nombre} className="w-12 h-12 object-contain rounded-lg bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-black uppercase truncate">{itemApartar.nombre}</p>
                      <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full">Preventa</span>
                    </div>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">Precio total</span>
                      <span className="text-white/50 line-through">${itemApartar.precioTotal?.toLocaleString('es-MX')} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">Pagas ahora (anticipo)</span>
                      <span className="text-orange-500 font-black">${itemApartar.anticipo?.toLocaleString('es-MX')} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Al recibir el producto</span>
                      <span className="text-white/50">${itemApartar.precioLiquidacion?.toLocaleString('es-MX')} MXN</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mb-6">
                  {items.map(item => (
                    <div key={item.productoId} className="flex items-center gap-3">
                      {item.imagen ? (
                        <img src={item.imagen} alt={item.nombre} className="w-12 h-12 object-contain rounded-lg bg-white flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-black uppercase truncate">{item.nombre}</p>
                        <p className="text-white/40 text-xs">x{item.cantidad}</p>
                      </div>
                      <p className="text-orange-500 font-black text-sm">${(item.precio * item.cantidad).toLocaleString('es-MX')}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 pt-4 mb-6">
                {descuentoHC > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/40 text-sm">Subtotal</span>
                    <span className="text-white/40 text-sm">${totalBruto.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                {descuentoHC > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-orange-500 text-sm font-black">Hecacoins</span>
                    <span className="text-orange-500 text-sm font-black">-${descuentoHC.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-white/60 font-black uppercase text-sm">{modoApartar ? 'Anticipo' : 'Total'}</span>
                  <span className="text-orange-500 font-black text-2xl">${totalFinal.toLocaleString('es-MX')} MXN</span>
                </div>
                {modoEnvio === 'bodega' && !modoApartar && (
                  <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-400 text-xs font-black uppercase">📦 Bodegatombe</p>
                    <p className="text-white/40 text-xs mt-1">Tu pedido se guardará en bodega.</p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button onClick={handlePagar} disabled={procesando}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl transition">
                {procesando ? 'Procesando...' : totalFinal === 0 ? '🎉 Canjear con Hecacoins' : modoApartar ? '🔒 Pagar anticipo' : '💳 Ir a pagar'}
              </button>
              <p className="text-white/20 text-xs text-center mt-3">Pago seguro con Mercado Pago</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}