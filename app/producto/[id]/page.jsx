import { getProducto, urlFor, calcularPrecioFinal } from '@/lib/sanity'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import GaleriaProducto from '@/app/components/GaleriaProducto'
import BotonCarrito from '@/app/components/BotonCarrito'
import BotonFavorito from '@/app/components/BotonFavorito'
import BotonApartar from '@/app/components/BotonApartar'

export async function generateMetadata({ params }) {
  const { id } = await params
  const producto = await getProducto(id)
  if (!producto) return { title: 'Producto no encontrado' }

  return {
    title: producto.nombre,
    description: producto.descripcion
      ? producto.descripcion.slice(0, 155)
      : `${producto.nombre} disponible en Hecatombe Coleccionables.`,
    openGraph: {
      title: producto.nombre,
      images: producto.imagenes?.[0]
        ? [{ url: urlFor(producto.imagenes[0]).width(800).url() }]
        : [],
    },
  }
}

export default async function Producto({ params }) {
  const { id } = await params
  const producto = await getProducto(id)

  if (!producto) return notFound()

  const whatsappUrl =
    'https://wa.me/524427183787?text=Hola%2C%20me%20interesa%20el%20producto%3A%20' +
    encodeURIComponent(producto.nombre)

  const esPreventa = producto.tipo === 'preventa'
  const anticipo = producto.anticipo || null
  const precioLiquidacion = producto.precioLiquidacion || (producto.precio && anticipo ? producto.precio - anticipo : null)
  const { precioFinal, enOferta, porcentajeOff } = calcularPrecioFinal(producto)

  return (
    <main className="min-h-screen bg-page">

      {/* Breadcrumb */}
      <div className="bg-page border-b border-[#1f1f1f] px-6 py-3 flex items-center gap-2 text-xs">
        <Link href="/" className="text-ink-muted hover:text-orange-600 font-bold uppercase tracking-wide transition">
          Inicio
        </Link>
        <span className="text-ink-muted">›</span>
        <Link href="/catalogo" className="text-ink-muted hover:text-orange-600 font-bold uppercase tracking-wide transition">
          Catálogo
        </Link>
        <span className="text-ink-muted">›</span>
        <span className="text-ink-muted font-bold uppercase tracking-wide truncate max-w-xs">{producto.nombre}</span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 gap-8">

        <GaleriaProducto imagenes={producto.imagenes} nombre={producto.nombre} />

        <div className="flex flex-col">

          <div className="flex items-center gap-2 mb-2">
            <span className="bg-surface-alt border border-line text-ink-muted text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
              {producto.marca}
            </span>
            {producto.categoria && (
              <span className="bg-surface-alt border border-line text-ink-muted text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                {producto.categoria}
              </span>
            )}
            {esPreventa && (
              <span className="bg-orange-500 text-black text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full">
                Preventa
              </span>
            )}
          </div>

          <h1 className="text-ink text-2xl font-black uppercase leading-tight mb-4">
            {producto.nombre}
          </h1>

          {/* Precio — diferente para preventa */}
          {esPreventa && anticipo ? (
            <div className="mb-5 bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
              <p className="text-orange-600 text-xs font-black uppercase tracking-widest mb-2">Preventa</p>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-ink-muted text-sm">${producto.precio?.toLocaleString('es-MX')} MXN</span>
                <span className="text-ink-muted text-xs">precio total</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-orange-600 font-black text-4xl">${anticipo.toLocaleString('es-MX')}</span>
                <span className="text-ink-muted text-sm">MXN anticipo</span>
              </div>
              {precioLiquidacion && (
                <p className="text-ink-muted text-xs mt-2">
                  + ${precioLiquidacion.toLocaleString('es-MX')} MXN al recibir el producto
                </p>
              )}
              {producto.fechaEstimada && (
                <p className="text-orange-400 text-xs mt-2 font-bold">
                  🗓 Llegada estimada: {new Date(producto.fechaEstimada).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : producto.precio ? (
            <div className="mb-5">
              {enOferta && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-ink-muted text-base line-through">${producto.precio.toLocaleString('es-MX')}</span>
                  <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-black uppercase px-2 py-0.5 rounded-full">-{porcentajeOff}%</span>
                </div>
              )}
              <span className="text-orange-600 font-black text-4xl">
                ${(enOferta ? precioFinal : producto.precio).toLocaleString('es-MX')}
              </span>
              <span className="text-ink-muted text-sm ml-2">MXN</span>
            </div>
          ) : (
            <p className="text-ink-muted text-sm font-bold uppercase mb-5">Precio a consultar</p>
          )}

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide mb-6 w-fit ${
            producto.disponible
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-surface-alt border border-line-strong text-ink-muted'
          }`}>
            <span className={`w-2 h-2 rounded-full ${producto.disponible ? 'bg-green-400' : 'bg-gray-600'}`} />
            {producto.disponible ? (esPreventa ? 'Preventa abierta' : 'En existencia') : 'Agotado'}
          </div>

          {producto.descripcion && (
            <div className="mb-6 bg-surface border border-[#1f1f1f] rounded-xl p-4">
              <p className="text-ink-muted text-xs font-black uppercase tracking-widest mb-2">Descripción</p>
              <p className="text-gray-300 text-sm leading-relaxed">{producto.descripcion}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { icon: '✅', text: 'Producto original' },
              { icon: '📦', text: 'Envío a todo México' },
              { icon: '🤝', text: 'Atención directa' },
              { icon: '🔒', text: 'Compra segura' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 bg-surface border border-[#1f1f1f] rounded-lg px-3 py-2">
                <span className="text-sm">{icon}</span>
                <span className="text-ink-muted text-xs font-bold">{text}</span>
              </div>
            ))}
          </div>

          {/* Botones según tipo */}
          {esPreventa ? (
            <BotonApartar
              productoId={producto._id}
              nombre={producto.nombre}
              anticipo={anticipo}
              precioLiquidacion={precioLiquidacion}
              precioTotal={producto.precio}
              imagen={producto.imagenes?.[0] ? urlFor(producto.imagenes[0]).width(200).url() : null}
            />
          ) : (
            producto.disponible && (
              <BotonCarrito
                productoId={producto._id}
                nombre={producto.nombre}
                precio={enOferta ? precioFinal : producto.precio}
                imagen={producto.imagenes?.[0] ? urlFor(producto.imagenes[0]).width(200).url() : null}
              />
            )
          )}

          <BotonFavorito productoId={producto._id} />

          {producto.disponible ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full mt-3 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5 fill-white">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.736 5.471 2.027 7.774L0 32l8.463-2.001A15.93 15.93 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 0 1-6.748-1.833l-.484-.287-5.02 1.187 1.234-4.874-.317-.5A13.238 13.238 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.27-9.77c-.398-.199-2.354-1.162-2.718-1.295-.364-.133-.63-.199-.895.2-.265.398-1.029 1.294-1.261 1.56-.232.265-.465.298-.863.1-.398-.2-1.681-.619-3.202-1.977-1.183-1.056-1.981-2.36-2.213-2.758-.232-.398-.025-.613.175-.811.179-.178.398-.465.597-.698.2-.232.265-.398.398-.663.133-.265.066-.497-.033-.696-.1-.2-.895-2.158-1.227-2.955-.323-.776-.65-.671-.895-.683l-.762-.013c-.265 0-.696.1-1.06.497-.364.398-1.393 1.362-1.393 3.32 0 1.957 1.426 3.848 1.625 4.113.2.265 2.805 4.282 6.796 6.005.95.41 1.692.655 2.27.839.954.303 1.823.26 2.51.158.765-.114 2.354-.962 2.686-1.892.332-.93.332-1.727.232-1.892-.099-.166-.364-.265-.762-.464z" />
              </svg>
              Preguntar por WhatsApp
            </a>
          ) : (
            <div className="w-full bg-surface-alt border border-line-strong text-ink-muted font-black text-sm uppercase tracking-widest py-4 rounded-xl text-center mt-3">
              Producto agotado
            </div>
          )}

          <p className="text-ink-muted text-xs text-center mt-3">
            ¿No está disponible? Pregúntanos por preventa →{' '}
            <a href={whatsappUrl} className="text-orange-600 hover:underline">WhatsApp</a>
          </p>

        </div>
      </div>
    </main>
  )
}