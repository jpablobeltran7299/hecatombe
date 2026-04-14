import { getProducto, urlFor } from '@/lib/sanity'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function Producto({ params }) {
  const { id } = await params
  const producto = await getProducto(id)

  if (!producto) return notFound()

  const whatsappUrl =
    'https://wa.me/524427183787?text=Hola%2C%20me%20interesa%20el%20producto%3A%20' +
    encodeURIComponent(producto.nombre)

  return (
    <main className="min-h-screen bg-[#0d0d0d]">

      {/* Breadcrumb */}
      <div className="bg-black border-b border-[#1f1f1f] px-6 py-3 flex items-center gap-2 text-xs">
        <Link href="/" className="text-gray-600 hover:text-orange-500 font-bold uppercase tracking-wide transition">
          Inicio
        </Link>
        <span className="text-gray-700">›</span>
        <Link href="/catalogo" className="text-gray-600 hover:text-orange-500 font-bold uppercase tracking-wide transition">
          Catálogo
        </Link>
        <span className="text-gray-700">›</span>
        <span className="text-gray-400 font-bold uppercase tracking-wide truncate max-w-xs">{producto.nombre}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 gap-8">

        {/* ── Columna izquierda: imagen ── */}
        <div className="flex flex-col gap-3">
          <div className="bg-[#111] border border-[#222] rounded-2xl aspect-square flex items-center justify-center overflow-hidden">
            {producto.imagenes && producto.imagenes[0] ? (
              <img
                src={urlFor(producto.imagenes[0]).width(600).height(600).url()}
                alt={producto.nombre}
                className="w-full h-full object-contain p-8"
              />
            ) : (
              <span className="text-8xl">🎁</span>
            )}
          </div>

          {/* Miniaturas si hay más imágenes */}
          {producto.imagenes && producto.imagenes.length > 1 && (
            <div className="flex gap-2">
              {producto.imagenes.slice(0, 4).map((img, i) => (
                <div key={i} className="w-16 h-16 bg-[#111] border border-[#222] rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={urlFor(img).width(64).height(64).url()}
                    alt={`${producto.nombre} ${i + 1}`}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Columna derecha: info ── */}
        <div className="flex flex-col">

          {/* Marca + categoría */}
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
              {producto.marca}
            </span>
            {producto.categoria && (
              <span className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {producto.categoria}
              </span>
            )}
          </div>

          {/* Nombre */}
          <h1 className="text-white text-2xl font-black uppercase leading-tight mb-4">
            {producto.nombre}
          </h1>

          {/* Precio */}
          {producto.precio ? (
            <div className="mb-5">
              <span className="text-orange-500 font-black text-4xl">
                ${producto.precio.toLocaleString('es-MX')}
              </span>
              <span className="text-gray-600 text-sm ml-2">MXN</span>
            </div>
          ) : (
            <p className="text-gray-500 text-sm font-bold uppercase mb-5">Precio a consultar</p>
          )}

          {/* Disponibilidad */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide mb-6 w-fit ${
            producto.disponible
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-[#1a1a1a] border border-[#333] text-gray-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${producto.disponible ? 'bg-green-400' : 'bg-gray-600'}`} />
            {producto.disponible ? 'En existencia' : 'Agotado'}
          </div>

          {/* Descripción */}
          {producto.descripcion && (
            <div className="mb-6 bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Descripción</p>
              <p className="text-gray-300 text-sm leading-relaxed">{producto.descripcion}</p>
            </div>
          )}

          {/* Ventajas */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { icon: '✅', text: 'Producto original' },
              { icon: '📦', text: 'Envío a todo México' },
              { icon: '🤝', text: 'Atención directa' },
              { icon: '🔒', text: 'Compra segura' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2">
                <span className="text-sm">{icon}</span>
                <span className="text-gray-400 text-xs font-bold">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA WhatsApp */}
          {producto.disponible ? (
  
    <a href={whatsappUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-colors"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5 fill-white">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.471 2.027 7.774L0 32l8.463-2.001A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.748-1.833l-.484-.287-5.02 1.187 1.234-4.874-.317-.5A13.238 13.238 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.77c-.398-.199-2.354-1.162-2.718-1.295-.364-.133-.63-.199-.895.2-.265.398-1.029 1.294-1.261 1.56-.232.265-.465.298-.863.1-.398-.2-1.681-.619-3.202-1.977-1.183-1.056-1.981-2.36-2.213-2.758-.232-.398-.025-.613.175-.811.179-.178.398-.465.597-.698.2-.232.265-.398.398-.663.133-.265.066-.497-.033-.696-.1-.2-.895-2.158-1.227-2.955-.323-.776-.65-.671-.895-.683l-.762-.013c-.265 0-.696.1-1.06.497-.364.398-1.393 1.362-1.393 3.32 0 1.957 1.426 3.848 1.625 4.113.2.265 2.805 4.282 6.796 6.005.95.41 1.692.655 2.27.839.954.303 1.823.26 2.51.158.765-.114 2.354-.962 2.686-1.892.332-.93.332-1.727.232-1.892-.099-.166-.364-.265-.762-.464z" />
    </svg>
    Preguntar por WhatsApp
  </a>
) : (
  <div className="w-full bg-[#1a1a1a] border border-[#333] text-gray-600 font-black text-sm uppercase tracking-widest py-4 rounded-xl text-center">
    Producto agotado
  </div>
)}

          {/* Botón Mercado Libre — solo si tiene mlUrl */}
          {producto.mlUrl && (
  
    <a href={producto.mlUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-center gap-3 w-full mt-3 border-2 border-[#FFE600] hover:bg-[#FFE600] text-[#FFE600] hover:text-black font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-all duration-200"
  >
    <svg width="20" height="20" viewBox="0 0 48 48" fill="currentColor">
      <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4zm0 6c3.9 0 7.4 1.4 10.2 3.6L13.6 33.8A13.9 13.9 0 0 1 10 24c0-7.7 6.3-14 14-14zm0 28c-3.9 0-7.4-1.4-10.2-3.6l20.6-20.2A13.9 13.9 0 0 1 38 24c0 7.7-6.3 14-14 14z"/>
    </svg>
    Comprar en Mercado Libre
  </a>
)}
          {/* Nota preventa */}
          <p className="text-gray-700 text-xs text-center mt-3">
            ¿No está disponible? Pregúntanos por preventa →{' '}
            <a href={whatsappUrl} className="text-orange-500 hover:underline">WhatsApp</a>
          </p>
        </div>
      </div>
    </main>
  )
}