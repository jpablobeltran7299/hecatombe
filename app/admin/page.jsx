'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/AuthProvider'

const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const autorizado = !authLoading && !!user && ADMINS.includes(user.email)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!ADMINS.includes(user.email)) {
      router.push('/')
    }
  }, [authLoading, user])

  if (authLoading) return (
    <main className="min-h-screen bg-page flex items-center justify-center">
      <p className="text-ink-muted">Verificando acceso...</p>
    </main>
  )

  if (!autorizado) return null

  return (
    <main className="min-h-screen bg-page px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase text-ink">
            Panel <span className="text-orange-500">Admin</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            { titulo: 'Productos', desc: 'Crear y editar productos', icon: '🎁', href: '/admin/productos' },
            { titulo: 'Inventario', desc: 'Stock y disponibilidad', icon: '📦', href: '/admin/inventario' },
            { titulo: 'Pedidos', desc: 'Historial de ventas', icon: '🛍️', href: '/admin/pedidos' },
            { titulo: 'Clientes', desc: 'Hecacoins y bodega', icon: '👥', href: '/admin/clientes' },
            { titulo: 'Bodegatombe', desc: 'Productos en bodega', icon: '🏪', href: '/admin/bodega' },
            { titulo: 'Clasificación', desc: 'Temáticas, universos y líneas', icon: '🏷️', href: '/admin/clasificacion' },
            { titulo: 'Banners', desc: 'Gestionar banners del home', icon: '🖼️', href: '/admin/banners' },
            { titulo: 'Dinámicas', desc: 'Rifas, concursos y más', icon: '🎯', href: '/admin/dinamicas' },
            { titulo: 'Marcas', desc: 'Gestionar marcas de productos', icon: '🏷️', href: '/admin/marcas' },
            { titulo: 'Configuración', desc: 'Ajustes generales del home', icon: '⚙️', href: '/admin/configuracion' },
          ].map(({ titulo, desc, icon, href }) => (
            <a key={titulo} href={href}
              className="bg-surface border border-line hover:border-orange-500 rounded-2xl p-6 flex flex-col gap-2 transition cursor-pointer">
              <span className="text-3xl">{icon}</span>
              <h3 className="font-black uppercase text-ink">{titulo}</h3>
              <p className="text-ink-muted text-sm">{desc}</p>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}