import { getProducto, urlFor } from '@/lib/sanity'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function Producto({ params }) {
  const { id } = await params
  const producto = await getProducto(id)

  if (!producto) return notFound()

  const whatsappUrl = "https://wa.me/521XXXXXXXXXX?text=Hola, me interesa el producto: " + producto.nombre

  return (
    <main className="min-h-screen">
      <div className="bg-[#1a1a2e] px-6 py-4">
        <Link href="/catalogo" className="text-gray-400 text-sm hover:text-white transition">
          Volver al catálogo
        </Link>
      </div>

      <div className="px-6 py-10 max-w-2xl mx-auto">
        <div className="h-64 bg-amber-50 rounded-2xl flex items-center justify-center overflow-hidden mb-8">
          {producto.imagenes && producto.imagenes[0] ? (
            <img
              src={urlFor(producto.imagenes[0]).width(400).height(400).fit('fill').bg('fef3c7').url()}
              alt={producto.nombre}
              className="w-full h-full object-contain p-6"
            />
          ) : (
            <span className="text-7xl">🎁</span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-medium mb-1">{producto.nombre}</h1>
            <p className="text-gray-400 text-sm">{producto.marca} · {producto.categoria}</p>
          </div>
          <span className={producto.disponible ? "shrink-0 text-sm px-3 py-1 rounded-full bg-green-50 text-green-800" : "shrink-0 text-sm px-3 py-1 rounded-full bg-red-50 text-red-800"}>
            {producto.disponible ? 'Disponible' : 'Agotado'}
          </span>
        </div>

        {producto.precio && (
          <p className="text-2xl font-medium text-amber-600 mb-6">
            {producto.precio.toLocaleString('es-MX')} MXN
          </p>
        )}

        {producto.descripcion && (
          <div className="mb-8">
            <h2 className="font-medium text-sm mb-2 text-gray-500 uppercase tracking-wide">Descripción</h2>
            <p className="text-gray-700 leading-relaxed">{producto.descripcion}</p>
          </div>
        )}

        {producto.disponible && (
          <a href={whatsappUrl} className="block w-full bg-emerald-600 text-white text-center font-medium py-4 rounded-xl hover:bg-emerald-700 transition">
            Preguntar por WhatsApp
          </a>
        )}
      </div>
    </main>
  )
}