'use client'
import { useState } from 'react'
import { urlFor } from '@/lib/sanity'

export default function GaleriaProducto({ imagenes, nombre }) {
  const [activa, setActiva] = useState(0)
  const [zoomAbierto, setZoomAbierto] = useState(false)

  const irRelativo = (delta) => {
    setActiva(prev => (prev + delta + imagenes.length) % imagenes.length)
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={() => imagenes?.[activa] && setZoomAbierto(true)}
        className={`bg-white border border-line rounded-2xl aspect-square flex items-center justify-center overflow-hidden ${imagenes?.[activa] ? 'cursor-zoom-in' : ''}`}
      >
        {imagenes?.[activa] ? (
          <img
            src={urlFor(imagenes[activa]).width(600).url()}
            alt={`${nombre} - imagen ${activa + 1}`}
            className="w-full h-full object-contain p-8"
          />
        ) : (
          <span className="text-8xl">🎁</span>
        )}
      </div>

      {imagenes?.length > 1 && (
        <div className="flex gap-2">
          {imagenes.slice(0, 4).map((img, i) => (
            <button
              key={i}
              onClick={() => setActiva(i)}
              className={`w-16 h-16 bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 transition-colors ${
                i === activa ? 'border-orange-500' : 'border-line hover:border-[#444]'
              }`}
            >
              <img
                src={urlFor(img).width(64).height(64).url()}
                alt={`${nombre} ${i + 1}`}
                className="w-full h-full object-contain p-1"
              />
            </button>
          ))}
        </div>
      )}

      {zoomAbierto && imagenes?.[activa] && (
        <div
          onClick={() => setZoomAbierto(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 sm:p-10"
        >
          <button
            onClick={() => setZoomAbierto(false)}
            aria-label="Cerrar"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-orange-500 border border-white/30 hover:border-orange-500 text-white hover:text-black flex items-center justify-center transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>

          {imagenes.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); irRelativo(-1) }}
                aria-label="Imagen anterior"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-orange-500 border border-white/30 hover:border-orange-500 text-white hover:text-black flex items-center justify-center transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); irRelativo(1) }}
                aria-label="Imagen siguiente"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-orange-500 border border-white/30 hover:border-orange-500 text-white hover:text-black flex items-center justify-center transition-colors"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          <img
            src={urlFor(imagenes[activa]).width(1600).url()}
            alt={`${nombre} - imagen ${activa + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain cursor-zoom-out"
          />
        </div>
      )}
    </div>
  )
}