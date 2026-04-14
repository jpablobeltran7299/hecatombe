import Link from 'next/link'
import { getProductosDestacados, getMarcas, getCategorias, getPreventas, getDinamicas, urlFor } from '@/lib/sanity'
import BannerCarousel from "./components/BannerCarousel";
import CarruselDestacados from './components/CarruselDestacados'

export default async function Home() {
  const [destacados, marcas, categorias, preventas, dinamicas] = await Promise.all([
    getProductosDestacados(),
    getMarcas(),
    getCategorias(),
    getPreventas(),
    getDinamicas(),
  ])

  const faqs = [
    {
      q: '¿Cómo funcionan las preventas?',
      a: 'Separas tu producto con un anticipo del 50%. Una vez que llega a nuestro almacén, liquidas el resto y coordinamos la entrega. Los tiempos varían según el proveedor, normalmente entre 4 y 12 semanas.',
    },
    {
      q: '¿Hacen envíos a toda la República?',
      a: 'Sí. Trabajamos con Estafeta y DHL. El costo de envío se calcula al momento del pago según tu código postal. También puedes recoger en Querétaro sin costo adicional.',
    },
    {
      q: '¿Los productos son originales?',
      a: '100%. Solo manejamos producto oficial licenciado. Nada de réplicas ni bootlegs. Si tienes dudas sobre alguna pieza, escríbenos y con gusto te enviamos fotos del artículo real.',
    },
    {
      q: '¿Qué métodos de pago aceptan?',
      a: 'Transferencia SPEI, depósito bancario, tarjeta de crédito/débito vía Mercado Pago, y efectivo en puntos OXXO Pay. Para preventas no aceptamos pago a meses sin intereses.',
    },
    {
      q: '¿Puedo cancelar una preventa?',
      a: 'Sí, con hasta 7 días de anticipación antes de que cierre el pedido al proveedor. El anticipo se devuelve como crédito en tienda. Después de ese punto, la cancelación no es posible.',
    },
    {
      q: '¿Tienen tienda física?',
      a: 'Por ahora operamos 100% en línea, pero realizamos entregas presenciales en Querétaro capital previa cita. Síguenos en redes para enterarte de pop-ups y eventos donde puedes vernos en persona.',
    },
  ]

  return (
    <main>
      {/* ── Banner preventa ── */}
      <div className="bg-orange-500 px-6 py-2 flex items-center gap-3">
        <p className="text-black text-xs font-bold uppercase tracking-wide">
          🔥 Preventas abiertas — consulta nuestro catálogo
        </p>
        <span className="bg-black text-orange-500 text-xs font-black px-3 py-0.5 rounded-full">
          Ver más
        </span>
      </div>

      <BannerCarousel />

      {/* ── Hero ── */}
      <section className="bg-black px-6 py-12 flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-white text-4xl font-black uppercase leading-tight mb-3">
            La tienda<br />
            <span className="text-orange-500">geek</span> que<br />
            te entiende
          </h1>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">
            Funkos, figuras y coleccionables de cultura pop. Comunidad activa, preventas y dinámicas.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/catalogo"
              className="bg-orange-500 text-black font-black text-xs uppercase tracking-widest px-6 py-3 rounded-lg"
            >
              Ver catálogo
            </Link>
            <Link
              href="#preventas"
              className="border-2 border-orange-500 text-orange-500 font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-lg"
            >
              Preventas
            </Link>
          </div>
        </div>
        <div className="bg-orange-500 rounded-xl p-6 text-center min-w-32">
          <span className="text-black text-4xl font-black block">800+</span>
          <span className="text-black text-xs font-black uppercase">Productos</span>
        </div>
      </section>

      {/* ── Categorías ── */}
      <section className="bg-[#111] px-6 py-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-white text-lg font-black uppercase tracking-wide">
            Categorías <span className="text-orange-500">populares</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categorias.map((cat) => (
            <Link
              key={cat._id}
              href={'/catalogo?categoria=' + cat._id}
              className="bg-black border-2 border-[#222] hover:border-orange-500 rounded-lg p-4 text-center transition"
            >
              <p className="text-white text-xs font-bold uppercase">{cat.nombre}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Marcas ── */}
      <section className="bg-[#111] px-6 pb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-white text-lg font-black uppercase tracking-wide">
            Marcas <span className="text-orange-500">disponibles</span>
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {marcas.map((marca) => (
            <Link
              key={marca._id}
              href={'/catalogo?marca=' + marca._id}
              className="bg-black border border-[#333] hover:border-orange-500 text-gray-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide transition"
            >
              {marca.nombre}
            </Link>
          ))}
        </div>
      </section>

 {/* ── Destacados ── */}
<section id="destacados" className="py-16 px-4 bg-[#111111]">
  <div className="max-w-6xl mx-auto">
    <p className="text-orange-500 font-black uppercase text-sm tracking-widest mb-2">Esta semana</p>
    <h2 className="text-white font-black uppercase text-4xl mb-10">DESTACADOS</h2>
    <CarruselDestacados productos={destacados} />
    <div className="text-center mt-10">
      <Link href="/catalogo" className="inline-block border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black font-black uppercase px-8 py-3 rounded-xl transition-colors">
        Ver catálogo completo
      </Link>
    </div>
  </div>
</section>

      {/* ════════════════════════════════════════════
          SECCIÓN 1 — PREVENTAS
      ════════════════════════════════════════════ */}
      <section id="preventas" className="bg-black px-6 py-10 border-t-2 border-[#222]">
        {/* Encabezado */}
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-white text-lg font-black uppercase tracking-wide">
            🔥 <span className="text-orange-500">Preventas</span> abiertas
          </h2>
          <Link href="/catalogo?tipo=preventa" className="text-orange-500 text-xs font-bold uppercase">
            Ver todas →
          </Link>
        </div>
        <p className="text-gray-500 text-xs mb-6 max-w-md">
          Aparta tu pieza antes de que llegue al almacén. Solo necesitas el 50% de anticipo — liquidas el resto al momento de la entrega.
        </p>

        {/* Cómo funciona */}
        <div className="grid grid-cols-3 gap-3 mb-7">
          {[
            { paso: '01', titulo: 'Separa', desc: '50% de anticipo para reservar tu lugar en el pedido grupal.' },
            { paso: '02', titulo: 'Espera', desc: 'Te avisamos por WhatsApp cuando llegue tu producto al almacén.' },
            { paso: '03', titulo: 'Liquida', desc: 'Pagas el restante y coordinamos envío o entrega en Querétaro.' },
          ].map(({ paso, titulo, desc }) => (
            <div key={paso} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <span className="text-orange-500 font-black text-2xl block mb-1">{paso}</span>
              <p className="text-white font-black text-sm uppercase mb-1">{titulo}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Grid de preventas dinámicas desde Sanity */}
        {preventas && preventas.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {preventas.map((producto) => (
              <Link
                key={producto._id}
                href={'/producto/' + producto._id}
                className="bg-[#111] border border-[#333] hover:border-orange-500 rounded-xl overflow-hidden transition group"
              >
                <div className="h-36 bg-[#1a1a1a] flex items-center justify-center overflow-hidden relative">
                  {producto.imagenes?.[0] ? (
                    <img
                      src={urlFor(producto.imagenes[0]).width(300).height(144).url()}
                      alt={producto.nombre}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-4xl">📦</span>
                  )}
                  <span className="absolute top-2 left-2 bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded">
                    Preventa
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-white font-bold text-sm mb-1 line-clamp-2">{producto.nombre}</p>
                  {producto.precio && (
                    <p className="text-orange-500 font-black text-sm">
                      Anticipo: ${(producto.precio * 0.5).toLocaleString('es-MX')}
                    </p>
                  )}
                  {producto.fechaEstimada && (
                    <p className="text-gray-600 text-xs mt-1">
                      Llega: {new Date(producto.fechaEstimada).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Placeholder cuando no hay preventas en Sanity aún */
          <div className="border-2 border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
            <p className="text-gray-600 text-sm font-bold uppercase">No hay preventas abiertas en este momento</p>
            <p className="text-gray-700 text-xs mt-1">Síguenos en redes para ser el primero en enterarte</p>
          </div>
        )}

        {/* CTA WhatsApp */}
        <div className="mt-6 bg-[#111] border border-[#2a2a2a] rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-white font-black text-sm uppercase">¿Tienes dudas sobre alguna preventa?</p>
            <p className="text-gray-500 text-xs">Te respondemos en minutos por WhatsApp</p>
          </div>
          <a
            href="https://wa.me/524427183787?text=Hola%2C%20tengo%20dudas%20sobre%20una%20preventa"
            className="bg-orange-500 text-black font-black text-xs uppercase tracking-wide px-5 py-2.5 rounded-lg whitespace-nowrap"
          >
            Preguntar →
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECCIÓN 2 — DINÁMICAS
      ════════════════════════════════════════════ */}
      <section id="dinamicas" className="bg-[#111] px-6 py-10 border-t-2 border-[#222]">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-white text-lg font-black uppercase tracking-wide">
            🎲 <span className="text-orange-500">Dinámicas</span> activas
          </h2>
        </div>
        <p className="text-gray-500 text-xs mb-6 max-w-md">
          Concursos, rifas y retos para la comunidad. Gana coleccionables, descuentos y merchandise exclusivo.
        </p>

        {dinamicas && dinamicas.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dinamicas.map((din) => (
              <div
                key={din._id}
                className="bg-black border-2 border-[#222] hover:border-orange-500 rounded-xl p-5 transition"
              >
                {/* Tipo badge */}
                <span className="bg-orange-500 text-black text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide mb-3 inline-block">
                  {din.tipo ?? 'Concurso'}
                </span>
                <p className="text-white font-black text-sm uppercase mb-1">{din.titulo}</p>
                <p className="text-gray-500 text-xs leading-relaxed mb-3">{din.descripcion}</p>
                {din.fechaFin && (
                  <p className="text-orange-500 text-xs font-bold">
                    ⏳ Termina:{' '}
                    {new Date(din.fechaFin).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                )}
                {din.enlace && (
                  <a
                    href={din.enlace}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-black uppercase text-black bg-orange-500 px-4 py-2 rounded-lg"
                  >
                    Participar →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder sin dinámicas en Sanity */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                tipo: 'Rifa',
                titulo: 'Rifa mensual — Funko exclusivo',
                desc: 'Por cada compra mayor a $500 recibes un boleto. Al final del mes sorteamos en vivo por Instagram.',
                badge: 'bg-purple-600',
              },
              {
                tipo: 'Concurso',
                titulo: 'Foto de colección del mes',
                desc: 'Comparte tu setup o colección con #HecatombeGeek. La más votada se lleva un voucher de $300.',
                badge: 'bg-blue-600',
              },
              {
                tipo: 'Flash sale',
                titulo: 'Descuento relámpago — 48h',
                desc: 'Productos seleccionados con hasta 20% OFF. Solo para seguidores de nuestro canal de WhatsApp.',
                badge: 'bg-orange-500',
              },
              {
                tipo: 'Trivia',
                titulo: 'Trivia de cultura pop',
                desc: 'Cada semana una pregunta en Instagram Stories. El primero en responder correctamente gana un Funko.',
                badge: 'bg-green-600',
              },
            ].map(({ tipo, titulo, desc, badge }) => (
              <div
                key={titulo}
                className="bg-black border-2 border-[#222] rounded-xl p-5"
              >
                <span className={`${badge} text-white text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide mb-3 inline-block`}>
                  {tipo}
                </span>
                <p className="text-white font-black text-sm uppercase mb-1">{titulo}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                <p className="text-gray-700 text-xs mt-3 italic">Próximamente — mantente al tanto en redes</p>
              </div>
            ))}
          </div>
        )}

        {/* Redes sociales */}
        <div className="mt-6 flex gap-3 flex-wrap">
          <a
            href="https://instagram.com/hecatombegeek"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black border border-[#333] hover:border-orange-500 text-gray-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide transition"
          >
            📸 Instagram
          </a>
          <a
            href="https://tiktok.com/@hecatombegeek"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black border border-[#333] hover:border-orange-500 text-gray-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide transition"
          >
            🎵 TikTok
          </a>
          <a
            href="https://wa.me/524427183787"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black border border-[#333] hover:border-orange-500 text-gray-300 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wide transition"
          >
            💬 Canal WhatsApp
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECCIÓN 3 — NOSOTROS
      ════════════════════════════════════════════ */}
      <section id="nosotros" className="bg-black px-6 py-10 border-t-2 border-[#222]">
        <div className="mb-6">
          <h2 className="text-white text-lg font-black uppercase tracking-wide mb-1">
            👾 Quiénes <span className="text-orange-500">somos</span>
          </h2>
          <p className="text-gray-500 text-xs max-w-sm">
            No somos solo una tienda — somos coleccionistas como tú.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Historia */}
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
            <span className="text-orange-500 text-2xl mb-3 block">🏪</span>
            <p className="text-white font-black text-sm uppercase mb-2">Nuestra historia</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Hecatombe nació en Querétaro cuando un grupo de amigos se cansó de pagar de más en tiendas de intermediarios. 
              Decidimos importar directo, construir comunidad y compartir el acceso a coleccionables que antes eran casi imposibles de conseguir en México.
            </p>
          </div>

          {/* Misión */}
          <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5">
            <span className="text-orange-500 text-2xl mb-3 block">🎯</span>
            <p className="text-white font-black text-sm uppercase mb-2">Nuestra misión</p>
            <p className="text-gray-500 text-xs leading-relaxed">
              Hacer accesible la cultura pop de calidad. Precios justos, producto 100% original, atención humana y 
              una comunidad donde el coleccionismo es un deporte de equipo.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { num: '800+', label: 'Productos' },
            { num: '3k+', label: 'Clientes' },
            { num: '5★', label: 'Valoración' },
          ].map(({ num, label }) => (
            <div key={label} className="bg-orange-500 rounded-xl p-4 text-center">
              <span className="text-black font-black text-2xl block">{num}</span>
              <span className="text-black text-xs font-black uppercase">{label}</span>
            </div>
          ))}
        </div>

        {/* Valores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: '✅', titulo: '100% Original', desc: 'Producto oficial licenciado. Cero bootlegs, cero réplicas.' },
            { icon: '📦', titulo: 'Envío a todo México', desc: 'Empaque seguro para que tu coleccionable llegue perfecto.' },
            { icon: '🤝', titulo: 'Trato directo', desc: 'Nos escribes tú, te responde una persona real. Sin bots.' },
          ].map(({ icon, titulo, desc }) => (
            <div key={titulo} className="flex gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div>
                <p className="text-white font-black text-xs uppercase mb-1">{titulo}</p>
                <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════
          SECCIÓN 4 — FAQ
      ════════════════════════════════════════════ */}
      <section id="faq" className="bg-[#111] px-6 py-10 border-t-2 border-[#222]">
        <div className="mb-6">
          <h2 className="text-white text-lg font-black uppercase tracking-wide mb-1">
            ❓ Preguntas <span className="text-orange-500">frecuentes</span>
          </h2>
          <p className="text-gray-500 text-xs">Si no encuentras tu respuesta aquí, escríbenos por WhatsApp.</p>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
            <details
              key={i}
              className="group bg-black border border-[#2a2a2a] hover:border-orange-500 rounded-xl overflow-hidden transition"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                <span className="text-white font-bold text-sm pr-4">{q}</span>
                <span className="text-orange-500 font-black text-lg flex-shrink-0 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-gray-400 text-xs leading-relaxed border-t border-[#1f1f1f] pt-4">{a}</p>
              </div>
            </details>
          ))}
        </div>

        {/* CTA final */}
        <div className="mt-8 bg-black border-2 border-orange-500 rounded-xl px-6 py-5 text-center">
          <p className="text-white font-black text-sm uppercase mb-1">¿Sigues con dudas?</p>
          <p className="text-gray-500 text-xs mb-4">Nuestro equipo está en línea de lunes a sábado de 10am a 8pm</p>
          <a
            href="https://wa.me/524427183787?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20Hecatombe"
            className="inline-block bg-orange-500 text-black font-black text-xs uppercase tracking-widest px-8 py-3 rounded-lg"
          >
            Escríbenos →
          </a>
        </div>
      </section>

      {/* ── WhatsApp ── */}
      <section
        id="contacto"
        className="bg-[#25D366] px-6 py-8 flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <p className="text-white font-black text-lg">¿Buscas algo específico?</p>
          <p className="text-green-100 text-sm">Escríbenos directo por WhatsApp</p>
        </div>
        <a
          href="https://wa.me/524427183787"
          className="bg-white text-green-800 font-black px-6 py-3 rounded-lg text-sm uppercase tracking-wide"
        >
          WhatsApp
        </a>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-black border-t-2 border-orange-500 px-6 py-4">
        <nav className="flex justify-center gap-6 mb-3 flex-wrap">
          {[
            ['Catálogo', '/catalogo'],
            ['Preventas', '#preventas'],
            ['Dinámicas', '#dinamicas'],
            ['Nosotros', '#nosotros'],
            ['FAQ', '#faq'],
            ['Contacto', '#contacto'],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="text-gray-600 hover:text-orange-500 text-xs font-bold uppercase tracking-widest transition"
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="text-gray-700 text-xs text-center uppercase tracking-widest">
          © 2026 Hecatombe · Cultura Pop · México
        </p>
      </footer>
    </main>
  )
}

/*
 * ─────────────────────────────────────────────────────
 * NOTAS DE INTEGRACIÓN CON SANITY
 * ─────────────────────────────────────────────────────
 *
 * 1. PREVENTAS — agrega en @/lib/sanity:
 *
 *    export async function getPreventas() {
 *      return client.fetch(`*[_type == "producto" && tipo == "preventa" && activo == true]
 *        | order(_createdAt desc)[0...6]{
 *          _id, nombre, imagenes, precio, fechaEstimada, marca
 *        }`)
 *    }
 *
 *    En tu schema de producto agrega:
 *      { name: 'tipo',          type: 'string',  options: { list: ['normal','preventa'] } }
 *      { name: 'fechaEstimada', type: 'date',    title: 'Fecha estimada de llegada' }
 *
 * 2. DINÁMICAS — nuevo schema en Sanity ("dinamica"):
 *
 *    export async function getDinamicas() {
 *      return client.fetch(`*[_type == "dinamica" && activa == true]
 *        | order(fechaFin asc)[0...4]{
 *          _id, titulo, descripcion, tipo, fechaFin, enlace
 *        }`)
 *    }
 *
 *    Schema sugerido:
 *      { name: 'titulo',      type: 'string' }
 *      { name: 'descripcion', type: 'text' }
 *      { name: 'tipo',        type: 'string', options: { list: ['Rifa','Concurso','Flash sale','Trivia'] } }
 *      { name: 'fechaFin',    type: 'datetime' }
 *      { name: 'enlace',      type: 'url' }
 *      { name: 'activa',      type: 'boolean' }
 *
 * 3. NOSOTROS y FAQ no requieren integración con Sanity —
 *    el contenido vive directamente en el componente.
 *    Si en el futuro quieres editar el FAQ desde el CMS,
 *    puedes crear un schema "faq" con campos {pregunta, respuesta}.
 * ─────────────────────────────────────────────────────
 */