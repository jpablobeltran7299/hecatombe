import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-black border-b-2 border-orange-500 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-white text-xl font-black uppercase tracking-widest">
        ⬡ Heca<span className="text-orange-500">tombe</span>
      </Link>
      <div className="flex gap-6">
        <Link href="/catalogo" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Catálogo
        </Link>
        <Link href="/#preventas" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Preventas
        </Link>
        <Link href="/#dinamicas" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Dinámicas
        </Link>
        <Link href="/#nosotros" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Nosotros
        </Link>
        <Link href="/#faq" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          FAQ
        </Link>
      </div>
    </nav>
  )
}