'use client'

import { useState, useEffect, useRef } from 'react'
import { getBanners, urlFor } from '@/lib/sanity'
import Link from 'next/link'

export default function BannerCarousel() {
  const [banners, setBanners] = useState([])
  const [current, setCurrent] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    getBanners().then(setBanners)
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [banners])

  const goTo = (i) => {
    setCurrent(i)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length)
    }, 5000)
  }

  const goToRelative = (delta) => {
    setCurrent(prev => (prev + delta + banners.length) % banners.length)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % banners.length)
    }, 5000)
  }

  if (!banners.length) return null

  const banner = banners[current]

  return (
    <div className="relative w-full overflow-hidden bg-page" style={{ aspectRatio: '16/6' }}>

      {/* Imagen de fondo */}
      {banners.map((b, i) => {
        const capaClassName = `absolute inset-0 transition-opacity duration-700 ${
          i === current ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`
        const imagen = b.imagen && (
          <img
            src={urlFor(b.imagen).width(1400).url()}
            alt={b.titulo || 'Banner'}
            className="w-full h-full object-contain"
          />
        )

        // Banner "solo imagen" (sin mostrarTexto) con href: todo el banner es clickeable.
        // Si mostrarTexto está activo, el link vive en el botón CTA del overlay de texto,
        // así que aquí NO se envuelve en <Link> para no anidar <a> dentro de <a>.
        if (!b.mostrarTexto && b.href) {
          return (
            <Link key={b._id} href={b.href} className={capaClassName}>
              {imagen}
            </Link>
          )
        }

        return (
          <div key={b._id} className={capaClassName}>
            {imagen}
          </div>
        )
      })}

      {/* Overlay y texto — solo si mostrarTexto está activo */}
      {banner.mostrarTexto && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex items-center">
          <div className="px-8 max-w-lg">
            {banner.tag && (
              <span className="inline-block bg-orange-500 text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                {banner.tag}
              </span>
            )}
            {banner.titulo && (
              <h2 className="text-ink text-3xl sm:text-4xl font-black uppercase leading-tight mb-2">
                {banner.titulo}
              </h2>
            )}
            {banner.subtitulo && (
              <p className="text-gray-300 text-sm sm:text-base mb-4">{banner.subtitulo}</p>
            )}
            {banner.cta && banner.href && (
              <Link href={banner.href}
                className="inline-block bg-orange-500 hover:bg-orange-600 text-black font-black uppercase text-sm px-6 py-3 rounded-xl transition">
                {banner.cta}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Flechas de navegación */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => goToRelative(-1)}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-orange-500 border border-white/30 hover:border-orange-500 text-white hover:text-black shadow-lg flex items-center justify-center transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => goToRelative(1)}
            aria-label="Banner siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-orange-500 border border-white/30 hover:border-orange-500 text-white hover:text-black shadow-lg flex items-center justify-center transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-orange-500 w-6' : 'bg-white/40'}`} />
          ))}
        </div>
      )}

    </div>
  )
}