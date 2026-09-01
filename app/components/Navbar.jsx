'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthProvider'

const LINKS = [
  { href: '/catalogo', label: 'Catálogo' },
  { href: '/#preventas', label: 'Preventas' },
  { href: '/dinamicas', label: 'Dinámicas' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/#faq', label: 'FAQ' },
]

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cantidadCarrito, setCantidadCarrito] = useState(0)
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    function actualizarContador() {
      const carrito = JSON.parse(localStorage.getItem('carrito') || '[]')
      const total = carrito.reduce((acc, i) => acc + i.cantidad, 0)
      setCantidadCarrito(total)
    }
    actualizarContador()
    window.addEventListener('storage', actualizarContador)
    window.addEventListener('carritoActualizado', actualizarContador)
    return () => {
      window.removeEventListener('storage', actualizarContador)
      window.removeEventListener('carritoActualizado', actualizarContador)
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/catalogo?busqueda=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setSearchOpen(false)
      setMenuOpen(false)
    }
  }

  const esAdmin = ADMINS.includes(user?.email)

  return (
    <>
      <nav className="bg-page border-b-2 border-orange-500 px-4 py-3 flex items-center justify-between sticky top-0 z-50">

        {/* Logo */}
        <Link href="/" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="Hecatombe" style={{ height: '32px', width: 'auto' }} />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-ink-muted text-xs font-bold uppercase tracking-widest hover:text-orange-500 transition">
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
                className="bg-surface border border-line-strong focus:border-orange-500 text-ink text-xs px-3 py-1.5 rounded-lg outline-none placeholder:text-ink-muted transition w-36"
              />
            )}
            <button
              type={searchOpen ? 'submit' : 'button'}
              onClick={() => !searchOpen && setSearchOpen(true)}
              className="text-ink-muted hover:text-orange-500 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </form>

          {/* Ícono carrito */}
          <Link href="/carrito" className="relative text-ink-muted hover:text-orange-500 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cantidadCarrito > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {cantidadCarrito}
              </span>
            )}
          </Link>

          {/* Botón Admin — solo para admins */}
          {esAdmin && (
            <Link href="/admin"
              className="border border-line-strong hover:border-orange-500 text-ink-muted hover:text-orange-500 text-xs font-black uppercase px-3 py-2 rounded-lg transition">
              Admin
            </Link>
          )}

          {/* Botón login/cuenta desktop */}
          {user ? (
            <Link href="/cuenta"
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase px-4 py-2 rounded-lg transition">
              Mi cuenta
            </Link>
          ) : (
            <Link href="/login"
              className="border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white text-xs font-black uppercase px-4 py-2 rounded-lg transition">
              Iniciar sesión
            </Link>
          )}
        </div>

        {/* Mobile — carrito + buscador + hamburguesa */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/carrito" className="relative text-ink-muted hover:text-orange-500 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {cantidadCarrito > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {cantidadCarrito}
              </span>
            )}
          </Link>
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="text-ink-muted hover:text-orange-500 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-ink hover:text-orange-500 transition"
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
        <div className="md:hidden bg-page border-b border-line px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="flex-1 bg-surface border border-line-strong focus:border-orange-500 text-ink text-sm px-3 py-2 rounded-lg outline-none placeholder:text-ink-muted transition"
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
        <div className="md:hidden bg-page border-b-2 border-orange-500 px-4 py-4 flex flex-col gap-4 sticky top-[53px] z-40">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              onClick={() => setMenuOpen(false)}
              className="text-ink-muted text-sm font-bold uppercase tracking-widest hover:text-orange-500 transition border-b border-[#1a1a1a] pb-3 last:border-0 last:pb-0">
              {label}
            </Link>
          ))}
          {esAdmin && (
            <Link href="/admin"
              onClick={() => setMenuOpen(false)}
              className="text-ink-muted text-sm font-black uppercase tracking-widest hover:text-orange-500 transition border-b border-[#1a1a1a] pb-3">
              Admin
            </Link>
          )}
          <Link href={user ? '/cuenta' : '/login'}
            onClick={() => setMenuOpen(false)}
            className="text-orange-500 text-sm font-black uppercase tracking-widest hover:text-orange-400 transition">
            {user ? 'Mi cuenta' : 'Iniciar sesión'}
          </Link>
        </div>
      )}
    </>
  )
}