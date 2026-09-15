'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { COSTO_ENVIO_MXN, BODEGA_THRESHOLD_MXN } from '@/lib/constants'

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
  const [direcciones, setDirecciones] = useState([])
  const [direccionId, setDireccionId] = useState(null)
  const [confirmoDireccion, setConfirmoDireccion] = useState(false)
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

      const { data: direccionesData } = await supabase
        .from('direcciones')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
      setDirecciones(direccionesData || [])
      if (direccionesData?.length === 1) setDireccionId(direccionesData[0].id)

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

    const requiereDireccion = modoEnvio === 'inmediato' || modoApartar
    if (requiereDireccion) {
      if (!direccionId) { setError('Elige una dirección de envío.'); return }
      if (!confirmoDireccion) { setError('Confirma que la dirección es correcta antes de pagar.'); return }
    } else {
      if (!direccion.nombre?.trim() || !direccion.telefono?.trim()) {
        setError('Por favor ingresa tu nombre y teléfono.'); return
      }
    }

    setProcesando(true)

    const { data: existente } = await supabase.from('perfiles').select('id').eq('user_id', user.id).single()
    const datosContacto = { nombre: direccion.nombre, apellido: direccion.apellido, telefono: direccion.telefono }
    if (existente) {
      await supabase.from('perfiles').update(datosContacto).eq('user_id', user.id)
    } else {
      await supabase.from('perfiles').insert({
        user_id: user.id, ...datosContacto,
        calle: '', colonia: '', ciudad: '', estado: '', cp: '', referencias: '',
      })
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
          direccion_id: requiereDireccion ? direccionId : null,
          tipo_pedido: tipoPedido,
          destino,
          hecacoins_a_canjear: hecacoinsACanjear,
          costo_envio: costoEnvio,
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
        if (!modoApartar) localStorage.removeItem('carrito')
        else localStorage.removeItem('apartar')
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
  const envioGratis = totalBruto >= 1200
  const costoEnvio = !modoApartar && modoEnvio === 'inmediato' && !envioGratis ? COSTO_ENVIO_MXN : 0
  const totalFinal = totalBruto - descuentoHC + costoEnvio

  const inputClass = "w-full bg-page border border-line-strong rounded-lg px-4 py-3 text-ink placeholder-ink-muted focus:outline-none focus:border-orange-500 transition"
  const labelClass = "text-ink-muted text-xs font-black uppercase tracking-widest mb-2 block"

  if (loading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-page px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black uppercase text-ink mb-2">
          {modoApartar ? 'Apartar producto' : 'Confirmar pedido'}
        </h1>
        {modoApartar && (
          <p className="text-orange-600 text-sm mb-8">
            Pagas el anticipo ahora y liquidas el resto cuando llegue tu producto.
          </p>
        )}
        {!modoApartar && <div className="mb-8" />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Formulario */}
          <div className="flex flex-col gap-4">

            {/* Opción de envío */}
            {!modoApartar && (
              <div className="bg-surface border border-line rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-600 mb-4">¿Cómo quieres recibir tu pedido?</h2>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setModoEnvio('inmediato')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${modoEnvio === 'inmediato' ? 'border-orange-500 bg-orange-500/10' : 'border-line hover:border-line-strong'}`}>
                    <span className="text-2xl mt-0.5">🚚</span>
                    <div>
                      <p className="text-ink font-black uppercase text-sm">Envío inmediato</p>
                      {envioGratis ? (
                        <p className="text-ink-muted text-xs mt-1">✅ ¡Envío gratis! Tu pedido supera $1,200 MXN</p>
                      ) : (
                        <div className="text-ink-muted text-xs mt-1">
                          <p>🚚 Envío desde ${COSTO_ENVIO_MXN}</p>
                          <p className="mt-1">📦 ¿Quieres ahorrártelo? Guarda tu pedido en <span className="font-black">Bodegatombe</span>, junta ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')} en compras y tu envío sale <span className="font-black">GRATIS</span></p>
                        </div>
                      )}
                    </div>
                  </button>
                  <button onClick={() => setModoEnvio('bodega')}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 transition text-left ${modoEnvio === 'bodega' ? 'border-orange-500 bg-orange-500/10' : 'border-line hover:border-line-strong'}`}>
                    <span className="text-2xl mt-0.5">📦</span>
                    <div>
                      <p className="text-ink font-black uppercase text-sm">Guardar en Bodega</p>
                      <p className="text-ink-muted text-xs mt-1">Acumula compras hasta $1,200 MXN y obtén envío gratis.</p>
                      {!envioGratis && (
                        <p className="text-orange-600 text-xs mt-1 font-bold">
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
              <div className="bg-surface border border-line rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-black uppercase text-orange-600">Hecacoins</h2>
                    <p className="text-ink-muted text-sm mt-1">
                      Tienes <span className="text-orange-600 font-black">{hecacoins.toLocaleString('es-MX')} HC</span> disponibles (= ${hecacoins.toLocaleString('es-MX')} MXN)
                    </p>
                  </div>
                  <button
                    onClick={() => setUsarHecacoins(!usarHecacoins)}
                    className={`w-12 h-6 rounded-full transition-colors ${usarHecacoins ? 'bg-orange-500' : 'bg-surface-alt'}`}>
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
            <div className="bg-surface border border-line rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Datos personales</h2>
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
              <div className="bg-surface border border-line rounded-2xl p-6">
                <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Dirección de envío</h2>

                {direcciones.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-ink-muted text-sm mb-4">No tienes direcciones guardadas.</p>
                    <a href="/cuenta?tab=direcciones" className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition inline-block text-sm">
                      Agregar dirección
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 mb-4">
                      {direcciones.map(d => (
                        <button key={d.id} onClick={() => { setDireccionId(d.id); setConfirmoDireccion(false) }}
                          className={`text-left p-4 rounded-xl border-2 transition ${direccionId === d.id ? 'border-orange-500 bg-orange-500/10' : 'border-line hover:border-line-strong'}`}>
                          <p className="text-ink font-black text-sm">{d.nombre} {d.apellido} <span className="text-ink-muted font-normal">· {d.telefono}</span></p>
                          <p className="text-ink-muted text-xs mt-1">{d.calle}, {d.colonia}, {d.ciudad}, {d.estado} CP {d.cp}</p>
                          {d.referencias && <p className="text-ink-muted text-xs mt-1">{d.referencias}</p>}
                        </button>
                      ))}
                    </div>
                    <a href="/cuenta?tab=direcciones" className="text-orange-600 hover:underline text-xs font-black uppercase">+ Agregar/editar direcciones</a>

                    {direccionId && (
                      <label className="flex items-start gap-3 mt-5 cursor-pointer">
                        <input type="checkbox" checked={confirmoDireccion} onChange={e => setConfirmoDireccion(e.target.checked)}
                          className="mt-0.5 w-4 h-4 accent-orange-500 flex-shrink-0" />
                        <span className="text-ink text-sm font-bold">
                          Confirmo que esta es la dirección correcta y es donde quiero recibir mi pedido.
                        </span>
                      </label>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="flex flex-col gap-4">
            <div className="bg-surface border border-line rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase text-orange-600 mb-6">Resumen</h2>

              {modoApartar && itemApartar ? (
                <div className="flex flex-col gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    {itemApartar.imagen ? (
                      <img src={itemApartar.imagen} alt={itemApartar.nombre} className="w-12 h-12 object-contain rounded-lg bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-surface-alt rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-ink text-xs font-black uppercase truncate">{itemApartar.nombre}</p>
                      <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded-full">Preventa</span>
                    </div>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-muted">Precio total</span>
                      <span className="text-ink-muted line-through">${itemApartar.precioTotal?.toLocaleString('es-MX')} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink-muted">Pagas ahora (anticipo)</span>
                      <span className="text-orange-600 font-black">${itemApartar.anticipo?.toLocaleString('es-MX')} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-muted">Al recibir el producto</span>
                      <span className="text-ink-muted">${itemApartar.precioLiquidacion?.toLocaleString('es-MX')} MXN</span>
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
                        <div className="w-12 h-12 bg-surface-alt rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-ink text-xs font-black uppercase truncate">{item.nombre}</p>
                        <p className="text-ink-muted text-xs">x{item.cantidad}</p>
                      </div>
                      <p className="text-orange-600 font-black text-sm">${(item.precio * item.cantidad).toLocaleString('es-MX')}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-line pt-4 mb-6">
                {descuentoHC > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-ink-muted text-sm">Subtotal</span>
                    <span className="text-ink-muted text-sm">${totalBruto.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                {descuentoHC > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-orange-600 text-sm font-black">Hecacoins</span>
                    <span className="text-orange-600 text-sm font-black">-${descuentoHC.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                {costoEnvio > 0 && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-ink-muted text-sm">Envío</span>
                    <span className="text-ink-muted text-sm">${costoEnvio.toLocaleString('es-MX')} MXN</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-ink-muted font-black uppercase text-sm">{modoApartar ? 'Anticipo' : 'Total'}</span>
                  <span className="text-orange-600 font-black text-2xl">${totalFinal.toLocaleString('es-MX')} MXN</span>
                </div>
                {modoEnvio === 'bodega' && !modoApartar && (
                  <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-blue-400 text-xs font-black uppercase">📦 Bodegatombe</p>
                    <p className="text-ink-muted text-xs mt-1">Tu pedido se guardará en bodega.</p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <button onClick={handlePagar} disabled={procesando || ((modoEnvio === 'inmediato' || modoApartar) && (!direccionId || !confirmoDireccion))}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl transition">
                {procesando ? 'Procesando...' : totalFinal === 0 ? '🎉 Canjear con Hecacoins' : modoApartar ? '🔒 Pagar anticipo' : '💳 Ir a pagar'}
              </button>
              <p className="text-ink-muted text-xs text-center mt-3">Pago seguro con Mercado Pago</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}