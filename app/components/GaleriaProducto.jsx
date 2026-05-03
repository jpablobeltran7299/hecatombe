'use client'
import { useState } from 'react'

export default function GaleriaProducto({ imagenes, nombre, urlFor }) {
  const [activa, setActiva] = useState(0)

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-[#111] border border-[#222] rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
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
              className={`w-16 h-16 bg-[#111] rounded-lg overflow-hidden flex items-center justify-center border-2 transition-colors ${
                i === activa ? 'border-orange-500' : 'border-[#222] hover:border-[#444]'
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
    </div>
  )
}