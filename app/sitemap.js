import { getTodosProductos } from '@/lib/sanity'

export default async function sitemap() {
  const productos = await getTodosProductos()

  const productosUrls = productos.map((p) => ({
    url: `https://hecatombe.mx/producto/${p._id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    {
      url: 'https://hecatombe.mx',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://hecatombe.mx/catalogo',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://hecatombe.mx/dinamicas',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...productosUrls,
  ]
}