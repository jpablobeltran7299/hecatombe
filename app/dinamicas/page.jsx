import { getDinamicas } from '@/lib/sanity'
import { urlFor } from '@/lib/sanity'
import Link from 'next/link'

const TIPO_CONFIG = {
  rifa:       { label: 'RIFA',       color: 'bg-purple-600',  emoji: '🎟️' },
  concurso:   { label: 'CONCURSO',   color: 'bg-blue-600',    emoji: '🏆' },
  flash_sale: { label: 'FLASH SALE', color: 'bg-orange-500',  emoji: '⚡' },
  trivia:     { label: 'TRIVIA',     color: 'bg-green-600',   emoji: '🧠' },
}

function CountdownBadge({ fechaFin }) {
  if (!fechaFin) return null
  const fin = new Date(fechaFin)
  const ahora = new Date()
  const diff = fin - ahora
  if (diff <= 0) return <span className="text-xs text-red-400 font-bold">CERRADA</span>
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return (
    <span className="text-xs text-orange-400 font-bold">
      ⏱ {dias}d {horas}h restantes
    </span>
  )
}

function RifaProgress({ total, vendidos = [] }) {
  if (!total) return null
  const pct = Math.round((vendidos.length / total) * 100)
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{vendidos.length} / {total} números</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function DinamicaCard({ d }) {
  const config = TIPO_CONFIG[d.tipo] || TIPO_CONFIG.concurso
  const destino = d.enlace || `https://wa.me/524427183787?text=Hola, me interesa la dinámica: ${encodeURIComponent(d.titulo)}`

  return (
    <div className="bg-[#111111] rounded-2xl overflow-hidden border border-gray-800 hover:border-orange-500 transition-colors flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-video bg-[#1a1a1a]">
        {d.imagen ? (
          <img
            src={urlFor(d.imagen).width(600).url()}
            alt={d.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {config.emoji}
          </div>
        )}
        <span className={`absolute top-3 left-3 ${config.color} text-white text-xs font-black px-3 py-1 rounded-full uppercase`}>
          {config.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h2 className="text-white font-black uppercase text-lg leading-tight">{d.titulo}</h2>
          <CountdownBadge fechaFin={d.fechaFin} />
        </div>

        {d.descripcion && (
          <p className="text-gray-400 text-sm leading-relaxed mb-3">{d.descripcion}</p>
        )}

        {d.tipo === 'rifa' && (
          <RifaProgress total={d.numerosTotal} vendidos={d.numerosVendidos} />
        )}

        <div className="mt-auto pt-4">
          
            <a href={destino}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-orange-500 hover:bg-orange-400 text-black font-black uppercase py-3 rounded-xl transition-colors text-sm">
            {d.tipo === 'rifa' ? '🎟️ Apartar número' : '👉 Participar'}
          </a>
        </div>
      </div>
    </div>
  )
}

export default async function DinamicasPage() {
  const dinamicas = await getDinamicas()
  const activas = dinamicas.filter(d => d.activa)
  const cerradas = dinamicas.filter(d => !d.activa)

  return (
    <main className="min-h-screen bg-black pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <p className="text-orange-500 font-black uppercase text-sm tracking-widest mb-2">Hecatombe</p>
          <h1 className="text-white font-black uppercase text-4xl md:text-5xl leading-none mb-4">
            DINÁMICAS
          </h1>
          <p className="text-gray-400 max-w-xl">
            Rifas, concursos, flash sales y trivias exclusivas para la comunidad.
          </p>
        </div>

        {/* Filtro tipos — visual, sin estado por ahora */}
        <div className="flex flex-wrap gap-2 mb-8">
          {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`${cfg.color} text-white text-xs font-black px-3 py-1 rounded-full uppercase`}>
              {cfg.emoji} {cfg.label}
            </span>
          ))}
        </div>

        {/* Grid activas */}
        {activas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {activas.map(d => <DinamicaCard key={d._id} d={d} />)}
          </div>
        ) : (
          <div className="text-center py-20 border border-gray-800 rounded-2xl mb-12">
            <p className="text-5xl mb-4">🎯</p>
            <p className="text-white font-black uppercase text-xl mb-2">Próximamente</p>
            <p className="text-gray-500 text-sm">Nuevas dinámicas en camino. Síguenos en redes.</p>
          </div>
        )}

        {/* Cerradas / historial */}
        {cerradas.length > 0 && (
          <>
            <h2 className="text-gray-600 font-black uppercase text-sm tracking-widest mb-4">Historial</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50">
              {cerradas.map(d => <DinamicaCard key={d._id} d={d} />)}
            </div>
          </>
        )}

      </div>
    </main>
  )
}