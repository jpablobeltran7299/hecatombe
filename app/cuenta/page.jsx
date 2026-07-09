'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProductosPorIds, urlFor } from '@/lib/sanity'

export default function CuentaPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [favoritos, setFavoritos] = useState([])
  const [productosF, setProductosF] = useState({})
  const [tab, setTab] = useState('perfil')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login')
      else {
        setUser(session.user)
        cargarFavoritos(session.user.id)
      }
      setLoading(false)
    })
  }, [])

  async function cargarFavoritos(userId) {
    const { data } = await supabase
      .from('favoritos')
      .select('producto_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const favs = data || []
    setFavoritos(favs)

    if (favs.length > 0) {
      const ids = favs.map(f => f.producto_id)
      const productos = await getProductosPorIds(ids)
      const mapa = {}
      productos.forEach(p => { mapa[p._id] = p })
      setProductosF(mapa)
    }
  }

  async function eliminarFavorito(productoId) {
    const { data: { session } } = await supabase.auth.getSession()
    await supabase
      .from('favoritos')
      .delete()
      .eq('user_id', session.user.id)
      .eq('producto_id', productoId)
    setFavoritos(prev => prev.filter(f => f.producto_id !== productoId))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-white/50">Cargando...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black uppercase text-white">Mi cuenta</h1>
          <button onClick={handleLogout}
            className="text-white/50 hover:text-orange-500 text-sm transition">
            Cerrar sesión
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-white/10">
          {[
            { key: 'perfil', label: 'Perfil' },
            { key: 'favoritos', label: `Favoritos (${favoritos.length})` },
            { key: 'pedidos', label: 'Pedidos' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-black uppercase tracking-widest transition border-b-2 -mb-px ${
                tab === key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-white/40 hover:text-white'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black uppercase text-orange-500 mb-4">Información</h2>
            <p className="text-white/70 text-sm">Correo: <span className="text-white">{user?.email}</span></p>
            <p className="text-white/70 text-sm mt-1">Miembro desde: <span className="text-white">{new Date(user?.created_at).toLocaleDateString('es-MX')}</span></p>
          </div>
        )}

        {/* Tab: Favoritos */}
        {tab === 'favoritos' && (
          <div>
            {favoritos.length === 0 ? (
              <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
                <p className="text-white/40 mb-4">No tienes favoritos guardados</p>
                <Link href="/catalogo"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-black uppercase px-6 py-3 rounded-xl transition">
                  Ver catálogo
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {favoritos.map(f => {
                  const p = productosF[f.producto_id]
                  return (
                    <div key={f.producto_id}
                      className="bg-[#111] border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                      {p?.imagenes?.[0] ? (
                        <img
                          src={urlFor(p.imagenes[0]).width(80).height(80).url()}
                          alt={p.nombre}
                          className="w-16 h-16 object-cover rounded-lg bg-[#1a1a1a] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black uppercase text-xs truncate">
                          {p?.nombre || 'Cargando...'}
                        </p>
                        {p?.precio && (
                          <p className="text-orange-500 font-black text-sm">
                            ${p.precio.toLocaleString('es-MX')} MXN
                          </p>
                        )}
                        <p className="text-white/20 text-xs mt-1">
                          {new Date(f.created_at).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Link href={`/producto/${f.producto_id}`}
                          className="text-orange-500 hover:underline text-xs font-black uppercase">
                          Ver
                        </Link>
                        <button onClick={() => eliminarFavorito(f.producto_id)}
                          className="text-white/20 hover:text-red-400 transition">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M18 6 6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Pedidos */}
        {tab === 'pedidos' && (
          <div className="bg-[#111] border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-white/40 mb-2">Historial de pedidos</p>
            <p className="text-white/20 text-sm">Disponible cuando se active Mercado Pago</p>
          </div>
        )}

      </div>
    </main>
  )
}