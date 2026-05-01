import Link from 'next/link'

export const metadata = {
  title: '404 — Página no encontrada',
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Número 404 */}
        <p className="text-[120px] font-black leading-none text-orange-500 select-none">
          404
        </p>

        {/* Texto */}
        <h1 className="text-white font-black uppercase text-2xl mb-3">
          Página no encontrada
        </h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          Esta página se perdió en el multiverso. Puede que haya sido descontinuada o que el enlace sea incorrecto.
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-orange-500 hover:bg-orange-400 text-black font-black uppercase px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Ir al inicio
          </Link>
          <Link
            href="/catalogo"
            className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black font-black uppercase px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Ver catálogo
          </Link>
        </div>

      </div>
    </main>
  )
}