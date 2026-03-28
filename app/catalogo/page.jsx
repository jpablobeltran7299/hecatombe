import { getProductosDestacados, getMarcas, getCategorias, urlFor } from '@/lib/sanity'

export default async function Catalogo({ searchParams }) {
  const params = await searchParams
  const [productos, marcas, categorias] = await Promise.all([
    getTodosProductos(),
    getMarcas(),
    getCategorias(),
  ])

  const marcaFiltro = params?.marca
  const categoriaFiltro = params?.categoria

  const productosFiltrados = productos.filter((p) => {
    if (marcaFiltro && p.marca !== marcas.find(m => m._id === marcaFiltro)?.nombre) return false
    if (categoriaFiltro && p.categoria !== categorias.find(c => c._id === categoriaFiltro)?.nombre) return false
    return true
  })

  return (
    <main className="min-h-screen">
      {/* Header */}
      <section className="bg-[#1a1a2e] text-white px-6 py-10">
        <h1 className="text-3xl font-medium mb-1">Catálogo</h1>
        <p className="text-gray-400 text-sm">
          {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
        </p>
      </section>

      <div className="px-6 py-8 flex flex-col sm:flex-row gap-8">
        {/* Sidebar filtros */}
        <aside className="sm:w-52 shrink-0">
          <div className="mb-6">
            <h3 className="font-medium text-sm mb-3">Marcas</h3>
            <div className="flex flex-col gap-1.5">
              <a href="/catalogo"
                className={`text-sm px-3 py-1.5 rounded-lg ${!marcaFiltro ? 'bg-purple-100 text-purple-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                Todas
              </a>
              {marcas.map((marca) => (
                <a key={marca._id} href={`/catalogo?marca=${marca._id}`}
                  className={`text-sm px-3 py-1.5 rounded-lg ${marcaFiltro === marca._id ? 'bg-purple-100 text-purple-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {marca.nombre}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-sm mb-3">Categorías</h3>
            <div className="flex flex-col gap-1.5">
              <a href="/catalogo"
                className={`text-sm px-3 py-1.5 rounded-lg ${!categoriaFiltro ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                Todas
              </a>
              {categorias.map((cat) => (
                <a key={cat._id} href={`/catalogo?categoria=${cat._id}`}
                  className={`text-sm px-3 py-1.5 rounded-lg ${categoriaFiltro === cat._id ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {cat.nombre}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid productos */}
        <div className="flex-1">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-2">No hay productos</p>
              <p className="text-gray-300 text-sm">Intenta con otro filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {productosFiltrados.map((producto) => (
                <a key={producto._id} href={`/producto/${producto._id}`}
                  className="bg-white border rounded-xl overflow-hidden hover:shadow-sm transition">
                  <div className="h-36 bg-amber-50 flex items-center justify-center overflow-hidden rounded-t-xl">
                {producto.imagenes && producto.imagenes[0] ? (
                    <img
                    src={urlFor(producto.imagenes[0]).width(300).height(144).url()}
                    alt={producto.nombre}
                    className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="text-4xl">🎁</span>
                )}
                </div>
                  <div className="p-3">
                    <p className="font-medium text-sm">{producto.nombre}</p>
                    <p className="text-xs text-gray-400 mb-1">{producto.marca}</p>
                    <p className="text-xs text-gray-400 mb-2">{producto.categoria}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      producto.disponible
                        ? 'bg-green-50 text-green-800'
                        : 'bg-red-50 text-red-800'
                    }`}>
                      {producto.disponible ? 'Disponible' : 'Agotado'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}