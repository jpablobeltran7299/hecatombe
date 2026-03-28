import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between">
      <Link href="/" className="text-white text-lg font-medium">
        Heca<span className="text-amber-400">tombe</span>
      </Link>
      <div className="flex gap-6">
        <Link href="/catalogo" className="text-gray-400 text-sm hover:text-white transition">
          Catálogo
        </Link>
        <Link href="/#contacto" className="text-gray-400 text-sm hover:text-white transition">
          Contacto
        </Link>
      </div>
    </nav>
  )
}