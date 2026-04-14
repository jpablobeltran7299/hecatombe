'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/catalogo?busqueda=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
    }
  }

  return (
    <nav className="bg-black border-b-2 border-orange-500 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-white text-xl font-black uppercase tracking-widest">
        <Image src="/logo.png" alt="Hecatombe" width={200} height={40} />
      </Link>

      <div className="flex items-center gap-6">
        <Link href="/catalogo" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Catálogo
        </Link>
        <Link href="/#preventas" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Preventas
        </Link>
        <Link href="/dinamicas" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Dinámicas
        </Link>
        <Link href="/#nosotros" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          Nosotros
        </Link>
        <Link href="/#faq" className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
          FAQ
        </Link>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          {searchOpen && (
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="bg-[#111] border border-[#333] focus:border-orange-500 text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-gray-600 transition w-40"
            />
          )}
          <button
            type={searchOpen ? 'submit' : 'button'}
            onClick={() => !searchOpen && setSearchOpen(true)}
            className="text-gray-400 hover:text-orange-500 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </form>
      </div>
    </nav>
  )
}