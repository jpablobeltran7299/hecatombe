'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity'

function ProductoCard({ producto }) {
  return (
    <Link href={`/producto/${producto._id}`} className="block group h-full">
      <div className="bg-[#111111] rounded-2xl overflow-hidden border border-gray-800 group-hover:border-orange-500 transition-colors flex flex-col h-full">
        <div className="aspect-square bg-[#1a1a1a] overflow-hidden flex-shrink-0">
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
          <p className="text-white font-black uppercase text-sm leading-tight truncate mb-1">
            {producto.nombre}
          </p>
          <p className="text-orange-500 font-black text-lg">
            ${producto.precio?.toLocaleString('es-MX')} MXN
          </p>
          <span className={`text-xs font-bold mt-auto ${producto.disponible ? 'text-green-400' : 'text-red-400'}`}>
            {producto.disponible ? '● Disponible' : '● Agotado'}
          </span>
        </div>
      </div>
    </Link>
  )
}

const GAP = 16 // gap-4 = 16px

export default function CarruselDestacados({ productos = [] }) {
  const [idx, setIdx] = useState(0)
  const [cardWidth, setCardWidth] = useState(0)
  const [visible, setVisible] = useState(4)
  const containerRef = useRef(null)

  useEffect(() => {
    const calcular = () => {
      if (!containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth
      const v = window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 4
      setVisible(v)
      setCardWidth((containerWidth - GAP * (v - 1)) / v)
    }
    calcular()
    window.addEventListener('resize', calcular)
    return () => window.removeEventListener('resize', calcular)
  }, [])

  const total = productos.length
  const maxIdx = Math.max(0, total - visible)

  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(maxIdx, i + 1))

  if (!total) return null

  const offset = idx * (cardWidth + GAP)

  return (
    <div className="relative">
      {/* Controles */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{total} producto{total !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-2xl flex items-center justify-center transition-colors leading-none"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={next}
            disabled={idx >= maxIdx}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-2xl flex items-center justify-center transition-colors leading-none"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Track */}
      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            gap: `${GAP}px`,
            transform: `translateX(-${offset}px)`,
          }}
        >
          {productos.map(p => (
            <div
              key={p._id}
              style={{ width: cardWidth || '25%', flexShrink: 0 }}
            >
              <ProductoCard producto={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {maxIdx > 0 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: maxIdx + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-orange-500' : 'bg-gray-700'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}