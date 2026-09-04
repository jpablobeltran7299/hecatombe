'use client'
import { useState, useRef, useEffect } from 'react'
import BadgesProducto from './BadgesProducto'
import Link from 'next/link'
import { urlFor, calcularPrecioFinal } from '@/lib/sanity'

function ProductoCard({ producto }) {
  const { precioFinal, enOferta } = calcularPrecioFinal(producto)
  return (
    <Link href={`/producto/${producto._id}`} className="block group h-full">
      <div className="bg-surface rounded-2xl overflow-hidden border border-gray-800 group-hover:border-orange-500 transition-colors flex flex-col h-full">
        <div className="aspect-square bg-surface-alt overflow-hidden relative flex-shrink-0">
          <BadgesProducto producto={producto} />
          {producto.imagenes?.[0] ? (
            <img
              src={urlFor(producto.imagenes[0]).width(400).height(400).url()}
              alt={producto.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <p className="text-ink font-black uppercase text-sm leading-tight truncate mb-1">
            {producto.nombre}
          </p>
          {enOferta ? (
            <p className="flex items-center gap-2 flex-wrap">
              <span className="text-ink-muted text-xs line-through">${producto.precio?.toLocaleString('es-MX')}</span>
              <span className="text-orange-600 font-black text-lg">${precioFinal?.toLocaleString('es-MX')} MXN</span>
            </p>
          ) : (
            <p className="text-orange-600 font-black text-lg">
              ${producto.precio?.toLocaleString('es-MX')} MXN
            </p>
          )}
          <span className={`text-xs font-bold mt-auto ${producto.disponible ? 'text-green-400' : 'text-red-400'}`}>
            {producto.disponible ? '● Disponible' : '● Agotado'}
          </span>
        </div>
      </div>
    </Link>
  )
}

const GAP = 16 // gap-4 = 16px
const SEGUNDOS_POR_TARJETA = 4 // ritmo constante del avance automático

function tarjetasVisibles(width) {
  if (width < 640) return 2
  if (width < 1024) return 3
  return 4
}

export default function CarruselDestacados({ productos = [] }) {
  const [cardWidth, setCardWidth] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [manualOffset, setManualOffset] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    const calcular = () => {
      if (!containerRef.current) return
      const visible = tarjetasVisibles(window.innerWidth)
      const containerWidth = containerRef.current.offsetWidth
      setCardWidth((containerWidth - GAP * (visible - 1)) / visible)
    }
    calcular()
    window.addEventListener('resize', calcular)
    return () => window.removeEventListener('resize', calcular)
  }, [])

  const total = productos.length
  const step = (cardWidth || 0) + GAP
  const singleSetWidth = total * step
  const duracion = total * SEGUNDOS_POR_TARJETA

  const dosCopias = [
    ...productos.map(p => ({ ...p, __k: `${p._id}-a` })),
    ...productos.map(p => ({ ...p, __k: `${p._id}-b` })),
  ]

  const prev = () => {
    if (!singleSetWidth) return
    setManualOffset(o => {
      const n = o + step
      return n > 0 ? n - singleSetWidth : n
    })
  }

  const next = () => {
    if (!singleSetWidth) return
    setManualOffset(o => {
      const n = o - step
      return n <= -singleSetWidth ? n + singleSetWidth : n
    })
  }

  if (!total) return null

  return (
    <div
      className="relative"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      {/* Controles */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-ink-muted text-sm">{total} producto{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 text-ink text-2xl flex items-center justify-center transition-colors leading-none"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 text-ink text-2xl flex items-center justify-center transition-colors leading-none"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Track */}
      <div ref={containerRef} className="overflow-hidden">
        <div
          style={{
            transform: `translateX(${manualOffset}px)`,
            transition: 'transform 400ms ease',
          }}
        >
          <div
            className={`flex marquee-destacados-track${pausado ? ' pausado' : ''}`}
            style={{ gap: `${GAP}px`, '--marquee-duration': `${duracion}s` }}
          >
            {dosCopias.map(p => (
              <div
                key={p.__k}
                style={{ width: cardWidth || '25%', flexShrink: 0 }}
              >
                <ProductoCard producto={p} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
