'use client'
import { useState } from 'react'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity'

function ProductoCard({ producto }) {
  return (
    <Link href={`/producto/${producto._id}`} className="block group">
      <div className="bg-[#111111] rounded-2xl overflow-hidden border border-gray-800 group-hover:border-orange-500 transition-colors">
        <div className="aspect-square bg-[#1a1a1a] overflow-hidden">
          {producto.imagenes?.[0] ? (
            <img
              src={urlFor(producto.imagenes[0]).width(400).url()}
              alt={producto.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
          )}
        </div>
        <div className="p-4">
          <p className="text-white font-black uppercase text-sm leading-tight truncate mb-1">
            {producto.nombre}
          </p>
          <p className="text-orange-500 font-black text-lg">
            ${producto.precio?.toLocaleString('es-MX')} MXN
          </p>
          <span className={`text-xs font-bold ${producto.disponible ? 'text-green-400' : 'text-red-400'}`}>
            {producto.disponible ? '● Disponible' : '● Agotado'}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default function CarruselDestacados({ productos = [] }) {
  const [idx, setIdx] = useState(0)

  // Cuántas cards visibles según breakpoint — manejamos con CSS
  // La lógica de paginación usa 4 como página en desktop
  const POR_PAGINA = 4
  const total = productos.length
  const maxIdx = Math.max(0, total - POR_PAGINA)

  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(maxIdx, i + 1))

  if (!total) return null

  return (
    <div className="relative">
      {/* Controles */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">{total} productos</p>
        <div className="flex gap-2">
          <button
            onClick={prev}
            disabled={idx === 0}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={next}
            disabled={idx >= maxIdx}
            className="w-10 h-10 rounded-full border border-gray-700 hover:border-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            aria-label="Siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Track — overflow hidden + translate */}
      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(calc(-${idx} * (25% + 4px)))` }}
        >
          {productos.map(p => (
            <div key={p._id} className="min-w-[calc(50%-8px)] sm:min-w-[calc(33.333%-11px)] lg:min-w-[calc(25%-12px)] flex-shrink-0">
              <ProductoCard producto={p} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {total > POR_PAGINA && (
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