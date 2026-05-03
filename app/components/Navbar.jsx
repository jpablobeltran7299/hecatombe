'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const LINKS = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/#preventas', label: 'Preventas' },
  { href: '/dinamicas', label: 'Dinámicas' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/#faq', label: 'FAQ' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/catalogo?busqueda=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
      setMenuOpen(false)
    }
  }

  return (
    <>
      <nav className="bg-black border-b-2 border-orange-500 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        
        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="Hecatombe" style={{ height: '32px', width: 'auto' }} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-gray-400 text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
              {label}
            </Link>
          ))}

          {/* Buscador desktop */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            {searchOpen && (
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-[#111] border border-[#333] focus:border-orange-500 text-white text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-gray-600 transition w-36"
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

        {/* Mobile — buscador + hamburguesa */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-gray-400 hover:text-orange-500 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-white hover:text-orange-500 transition"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Buscador mobile */}
      {searchOpen && (
        <div className="md:hidden bg-black border-b border-[#222] px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="flex-1 bg-[#111] border border-[#333] focus:border-orange-500 text-white text-sm px-3 py-2 rounded-lg outline-none placeholder:text-gray-600 transition"
            />
            <button type="submit"
              className="bg-orange-500 text-black font-black text-xs px-4 rounded-lg uppercase">
              Buscar
            </button>
          </form>
        </div>
      )}

      {/* Menú mobile */}
      {menuOpen && (
        <div className="md:hidden bg-black border-b-2 border-orange-500 px-4 py-4 flex flex-col gap-4 sticky top-[53px] z-40">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              onClick={() => setMenuOpen(false)}
              className="text-gray-400 text-sm font-bold uppercase tracking-widest hover:text-orange-500 transition border-b border-[#1a1a1a] pb-3 last:border-0 last:pb-0">
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  )
}