import { createClient } from 'next-sanity'

// Cliente de Sanity con permisos de escritura — solo usar en server-side
// (rutas API), nunca en código de cliente.
export function getSanityWriteClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: '2024-01-01',
    token: process.env.SANITY_WRITE_TOKEN,
    useCdn: false,
  })
}

// Descuento atómico de stock — usa dec() de Sanity (operación a nivel de
// documento) en vez de leer-y-restar, para que dos compras casi simultáneas
// de la última pieza no puedan ambas "ver" el mismo stock y vender de más.
export async function descontarStock(sanityClient, productoId, cantidad = 1) {
  const producto = await sanityClient.fetch(
    `*[_type == "producto" && _id == $id][0]{ _id, stock }`,
    { id: productoId }
  )
  if (!producto || producto.stock === null || producto.stock === undefined) return

  await sanityClient.patch(productoId).dec({ stock: cantidad || 1 }).commit()

  const actualizado = await sanityClient.fetch(`*[_id == $id][0]{ stock }`, { id: productoId })
  let stockFinal = actualizado?.stock ?? 0

  if (stockFinal < 0) {
    // dec() no tiene piso en 0 — si aun así se vendió de más por una carrera
    // muy ajustada, se corrige a 0 en vez de dejar un número negativo visible.
    await sanityClient.patch(productoId).set({ stock: 0 }).commit()
    stockFinal = 0
  }

  // "activo" nunca se toca aquí — quedarse sin stock no debe ocultar el
  // producto del admin (ver comentario en app/api/webhook/route.jsx).
  await sanityClient.patch(productoId).set({
    disponible: stockFinal > 0,
    ultimasPiezas: stockFinal <= 3 && stockFinal > 0,
  }).commit()
}
