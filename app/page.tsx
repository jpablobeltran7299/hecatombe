import Link from 'next/link'
import { getProductosDestacados, getMarcas, getCategorias, urlFor } from '@/lib/sanity'

export default async function Home() {
  const [destacados, marcas, categorias] = await Promise.all([
    getProductosDestacados(),
    getMarcas(),
    getCategorias(),
  ])

  return (
    <main>
      <section className="bg-[#1a1a2e] text-white text-center py-16 px-6">
        <h1 className="text-4xl font-medium mb-3">
          Tu colección, <span className="text-amber-400">un nivel arriba</span>
        </h1>
        <p className="text-gray-400 mb-8">Funkos, figuras, autos y más — coleccionables únicos</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/catalogo" className="bg-amber-400 text-amber-900 font-medium px-6 py-3 rounded-lg">
            Ver catálogo
          </Link>
          <a href="#contacto" className="border border-white/30 text-white px-6 py-3 rounded-lg">
            Contáctanos
          </a>
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-10">
        <h2 className="text-lg font-medium mb-1">Categorías</h2>
        <p className="text-gray-500 text-sm mb-6">Encuentra lo que buscas</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {categorias.map((cat) => (
            <Link key={cat._id} href={"/catalogo?categoria=" + cat._id}
              className="bg-white border rounded-xl p-4 text-center hover:shadow-sm transition">
              <p className="font-medium text-sm">{cat.nombre}</p>
            </Link>
          ))}
        </div>

        <h2 className="text-lg font-medium mb-1">Marcas</h2>
        <p className="text-gray-500 text-sm mb-4">Filtra por tu favorita</p>
        <div className="flex gap-2 flex-wrap">
          {marcas.map((marca) => (
            <Link key={marca._id} href={"/catalogo?marca=" + marca._id}
              className="bg-purple-50 border border-purple-200 text-purple-800 text-sm font-medium px-4 py-1.5 rounded-full hover:bg-purple-100 transition">
              {marca.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-10">
        <h2 className="text-lg font-medium mb-1">Destacados</h2>
        <p className="text-gray-500 text-sm mb-6">Selección especial de la semana</p>
        {destacados.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay productos destacados aún.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {destacados.map((producto) => (
              <Link key={producto._id} href={"/producto/" + producto._id}
                className="bg-white border rounded-xl overflow-hidden hover:shadow-sm transition">
                <div className="h-36 bg-amber-50 flex items-center justify-center overflow-hidden">
                  {producto.imagenes && producto.imagenes[0] ? (
                    <img
                      src={urlFor(producto.imagenes[0]).width(300).height(144).url()}
                      alt={producto.nombre}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-4xl">🎁</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm">{producto.nombre}</p>
                  <p className="text-xs text-gray-400 mb-2">{producto.marca}</p>
                  <span className={producto.disponible ? "text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-800" : "text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-800"}>
                    {producto.disponible ? 'Disponible' : 'Agotado'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="contacto" className="bg-emerald-600 px-6 py-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-white font-medium">¿Buscas algo específico?</p>
          <p className="text-emerald-200 text-sm">Escríbenos y te ayudamos</p>
        </div>
        <a href="https://wa.me/521XXXXXXXXXX"
          className="bg-white text-emerald-800 font-medium px-6 py-2.5 rounded-lg text-sm">
          WhatsApp
        </a>
      </section>
    </main>
  )
}