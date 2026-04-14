import { getTodosProductos, getMarcas, getCategorias, urlFor } from '@/lib/sanity'
import Link from 'next/link'

export default async function Catalogo({ searchParams }) {
  const params = await searchParams
  const [productos, marcas, categorias] = await Promise.all([
    getTodosProductos(),
    getMarcas(),
    getCategorias(),
  ])

  const marcaFiltro = params?.marca
  const categoriaFiltro = params?.categoria

  const busqueda = params?.busqueda?.toLowerCase() || ''

  const productosFiltrados = productos.filter((p) => {
  if (marcaFiltro && p.marca !== marcas.find(m => m._id === marcaFiltro)?.nombre) return false
  if (categoriaFiltro && p.categoria !== categorias.find(c => c._id === categoriaFiltro)?.nombre) return false
  if (busqueda && !p.nombre?.toLowerCase().includes(busqueda)) return false
  return true
})

  return (
    <main className="min-h-screen bg-[#0d0d0d]">

      {/* Header */}
<section className="bg-black border-b-2 border-orange-500 px-6 py-8">
  <h1 className="text-white text-2xl font-black uppercase tracking-wide mb-1">
    Catálogo <span className="text-orange-500">completo</span>
  </h1>
  <p className="text-gray-500 text-xs uppercase tracking-widest">
    {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
  </p>
</section>

      <div className="px-4 py-6 flex flex-col sm:flex-row gap-6 max-w-7xl mx-auto">

        {/* Sidebar filtros */}
        <aside className="sm:w-48 shrink-0">
          <div className="bg-black border border-[#222] rounded-xl p-4 mb-4">
            <h3 className="text-orange-500 text-xs font-black uppercase tracking-widest mb-3">Marcas</h3>
            <div className="flex flex-col gap-1">
              <a href="/catalogo"
                className={`text-xs px-3 py-2 rounded-lg font-bold uppercase tracking-wide transition ${
                  !marcaFiltro
                    ? 'bg-orange-500 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}>
                Todas
              </a>
              {marcas.map((marca) => (
                <a key={marca._id} href={`/catalogo?marca=${marca._id}`}
                  className={`text-xs px-3 py-2 rounded-lg font-bold uppercase tracking-wide transition ${
                    marcaFiltro === marca._id
                      ? 'bg-orange-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}>
                  {marca.nombre}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-black border border-[#222] rounded-xl p-4">
            <h3 className="text-orange-500 text-xs font-black uppercase tracking-widest mb-3">Categorías</h3>
            <div className="flex flex-col gap-1">
              <a href="/catalogo"
                className={`text-xs px-3 py-2 rounded-lg font-bold uppercase tracking-wide transition ${
                  !categoriaFiltro
                    ? 'bg-orange-500 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}>
                Todas
              </a>
              {categorias.map((cat) => (
                <a key={cat._id} href={`/catalogo?categoria=${cat._id}`}
                  className={`text-xs px-3 py-2 rounded-lg font-bold uppercase tracking-wide transition ${
                    categoriaFiltro === cat._id
                      ? 'bg-orange-500 text-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}>
                  {cat.nombre}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid productos */}
        <div className="flex-1">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#222] rounded-xl">
              <p className="text-gray-500 text-sm font-bold uppercase">No hay productos</p>
              <p className="text-gray-700 text-xs mt-1">Intenta con otro filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {productosFiltrados.map((producto) => (
                <Link key={producto._id} href={`/producto/${producto._id}`}
                  className="group bg-[#111] border border-[#222] hover:border-orange-500 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-orange-500/10 flex flex-col">

                  {/* Imagen */}
                  <div className="relative bg-[#1a1a1a] aspect-square flex items-center justify-center overflow-hidden">
                    {producto.imagenes && producto.imagenes[0] ? (
                      <img
                        src={urlFor(producto.imagenes[0]).width(400).height(400).url()}
                        alt={producto.nombre}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-5xl">🎁</span>
                    )}

                    {/* Badge disponibilidad */}
                    <span className={`absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded ${
                      producto.disponible
                        ? 'bg-green-500 text-white'
                        : 'bg-[#333] text-gray-400'
                    }`}>
                      {producto.disponible ? 'Disponible' : 'Agotado'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">{producto.marca}</p>
                    <p className="text-white font-bold text-sm leading-snug mb-2 flex-1">{producto.nombre}</p>

                    <div className="flex items-center justify-between mt-auto">
                      {producto.precio ? (
                        <span className="text-orange-500 font-black text-base">
                          ${producto.precio.toLocaleString('es-MX')}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs font-bold uppercase">Consultar</span>
                      )}
                      <span className="text-orange-500 text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}