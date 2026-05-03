import { getTodosProductos } from '@/lib/sanity'

export default async function sitemap() {
  const productos = await getTodosProductos()

  const productosUrls = productos.map((p) => ({
    url: `https://www.hecatombe.com.mx/producto/${p._id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://www.hecatombe.com.mx',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://www.hecatombe.com.mx/catalogo',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://www.hecatombe.com.mx/dinamicas',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...productosUrls,
  ]
}