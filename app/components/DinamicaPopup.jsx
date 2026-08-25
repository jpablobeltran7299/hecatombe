'use client'

import { useEffect, useState } from 'react'
import { urlFor } from '@/lib/sanity'

export default function DinamicaPopup({ dinamica }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!dinamica) return
    const key = `dinamica_popup_cerrado_${dinamica._id}`
    if (sessionStorage.getItem(key)) return
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [dinamica])

  if (!dinamica || !visible) return null

  function cerrar() {
    sessionStorage.setItem(`dinamica_popup_cerrado_${dinamica._id}`, '1')
    setVisible(false)
  }

  const destino = dinamica.enlace || `https://wa.me/524427183787?text=Hola, me interesa la dinámica: ${encodeURIComponent(dinamica.titulo)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={cerrar}>
      <div
        className="relative bg-[#111111] border border-orange-500/40 rounded-2xl overflow-hidden max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={cerrar}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg hover:bg-black/80 transition"
        >
          ×
        </button>

        <div className="relative aspect-video bg-[#1a1a1a]">
          {dinamica.imagen ? (
            <img
              src={urlFor(dinamica.imagen).width(600).url()}
              alt={dinamica.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🎯</div>
          )}
        </div>

        <div className="p-5">
          <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide mb-3 inline-block">
            Dinámica activa
          </span>
          <h3 className="text-white font-black uppercase text-lg leading-tight mb-2">{dinamica.titulo}</h3>
          {dinamica.descripcion && (
            <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-3">{dinamica.descripcion}</p>
          )}
          <a
            href={destino}
            target="_blank"
            rel="noopener noreferrer"
            onClick={cerrar}
            className="block w-full text-center bg-orange-500 hover:bg-orange-400 text-black font-black uppercase py-3 rounded-xl transition-colors text-sm"
          >
            {dinamica.tipo === 'rifa' ? '🎟️ Apartar número' : '👉 Participar'}
          </a>
        </div>
      </div>
    </div>
  )
}
