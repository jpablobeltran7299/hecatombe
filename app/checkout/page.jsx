'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [items, setItems] = useState([])
  const [direccion, setDireccion] = useState({
    nombre: '', apellido: '', telefono: '',
    calle: '', colonia: '', ciudad: '',
    estado: '', cp: '', referencias: ''
  })
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setUser(session.user)

      // Cargar perfil guardado
      const { data } = await supabase
        .from('perfiles')
        .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
        .eq('user_id', session.user.id)
        .single()

      if (data) setDireccion(data)
      setLoading(false)
    })

    const carritoLocal = JSON.parse(localStorage.getItem('carrito') || '[]')
    if (carritoLocal.length === 0) router.push('/carrito')
    setItems(carritoLocal)
  }, [])

  async function handlePagar() {
    setError('')

    // Validar campos obligatorios
    const requeridos = ['nombre', 'apellido', 'telefono', 'calle', 'colonia', 'ciudad', 'estado', 'cp']
    const faltantes = requeridos.filter(k => !direccion[k]?.trim())
    if (faltantes.length > 0) {
      setError('Por favor completa todos los campos obligatorios.')
      return
    }

    setProcesando(true)

    // Guardar dirección actualizada en perfil
    const { data: existente } = await supabase
      .from('perfiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existente) {
      await supabase.from('perfiles').update(direccion).eq('user_id', user.id)
    } else {
      await supabase.from('perfiles').insert({ user_id: user.id, ...direccion })
    }

    // Crear preferencia de pago
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          userId: user.id,
          userEmail: user.email,
          direccion,
        }),
      })

      const data = await res.json()
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

  const total = items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)

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
        <h1 className="text-3xl font-black uppercase text-white mb-8">Confirmar pedido</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Formulario dirección */}
          <div className="flex flex-col gap-4">

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Datos personales</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input type="text" value={direccion.nombre}
                    onChange={e => setDireccion({ ...direccion, nombre: e.target.value })}
                    placeholder="Nombre" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Apellido *</label>
                  <input type="text" value={direccion.apellido}
                    onChange={e => setDireccion({ ...direccion, apellido: e.target.value })}
                    placeholder="Apellido" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Teléfono *</label>
                  <input type="tel" value={direccion.telefono}
                    onChange={e => setDireccion({ ...direccion, telefono: e.target.value })}
                    placeholder="Tu número de teléfono" className={inputClass} />
                </div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Dirección de envío</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Calle y número *</label>
                  <input type="text" value={direccion.calle}
                    onChange={e => setDireccion({ ...direccion, calle: e.target.value })}
                    placeholder="Ej. Av. Constituyentes 123" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Colonia *</label>
                  <input type="text" value={direccion.colonia}
                    onChange={e => setDireccion({ ...direccion, colonia: e.target.value })}
                    placeholder="Nombre de tu colonia" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ciudad *</label>
                  <input type="text" value={direccion.ciudad}
                    onChange={e => setDireccion({ ...direccion, ciudad: e.target.value })}
                    placeholder="Tu ciudad" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estado *</label>
                  <input type="text" value={direccion.estado}
                    onChange={e => setDireccion({ ...direccion, estado: e.target.value })}
                    placeholder="Tu estado" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Código postal *</label>
                  <input type="text" value={direccion.cp}
                    onChange={e => setDireccion({ ...direccion, cp: e.target.value })}
                    placeholder="CP" className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>
                    Referencias <span className="text-white/20 normal-case font-normal">(opcional)</span>
                  </label>
                  <textarea value={direccion.referencias}
                    onChange={e => setDireccion({ ...direccion, referencias: e.target.value })}
                    placeholder="Ej. Casa azul, portón negro"
                    rows={2} className={`${inputClass} resize-none`} />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-black uppercase text-orange-500 mb-6">Resumen</h2>

              <div className="flex flex-col gap-3 mb-6">
                {items.map(item => (
                  <div key={item.productoId} className="flex items-center gap-3">
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre}
                        className="w-12 h-12 object-contain rounded-lg bg-white flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-xl flex-shrink-0">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-black uppercase truncate">{item.nombre}</p>
                      <p className="text-white/40 text-xs">x{item.cantidad}</p>
                    </div>
                    <p className="text-orange-500 font-black text-sm">
                      ${(item.precio * item.cantidad).toLocaleString('es-MX')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-white/60 font-black uppercase text-sm">Total</span>
                  <span className="text-orange-500 font-black text-2xl">${total.toLocaleString('es-MX')} MXN</span>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <button
                onClick={handlePagar}
                disabled={procesando}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black uppercase py-4 rounded-xl transition">
                {procesando ? 'Procesando...' : '💳 Ir a pagar'}
              </button>
              <p className="text-white/20 text-xs text-center mt-3">Pago seguro con Mercado Pago</p>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}