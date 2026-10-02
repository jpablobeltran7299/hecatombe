import { getProductosPorIds } from './sanity'

// Un pedido normal/liquidación trae `items: [{producto_id, cantidad}]`, y
// desde que se detectó que las piezas únicas/numeradas se borran de Sanity
// una vez vendidas (ver pedido #13, operación MP 181833656256), también
// `{nombre, precio, imagen}` — un snapshot de cómo era el producto al
// momento de la compra, para que el historial no dependa de que Sanity
// todavía lo tenga. Pedidos viejos (de antes de este fix) no traen ese
// snapshot — en esos casos se sigue dependiendo de la consulta en vivo.
// Un apartado o un pedido de bodega insertado manualmente trae solo la
// columna singular `producto_id` (un solo producto, cantidad 1).
export function extraerLineas(pedido) {
  if (Array.isArray(pedido.items) && pedido.items.length > 0) {
    return pedido.items
      .filter(it => it?.producto_id)
      .map(it => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad || 1,
        nombreSnapshot: it.nombre || null,
        precioSnapshot: it.precio ?? null,
        imagenSnapshot: it.imagen || null,
      }))
  }
  if (pedido.producto_id) {
    return [{ producto_id: pedido.producto_id, cantidad: 1, nombreSnapshot: null, precioSnapshot: null, imagenSnapshot: null }]
  }
  return []
}

// Junta los producto_id de una lista de pedidos, los resuelve UNA sola vez
// contra Sanity, y devuelve los mismos pedidos con `lineas: [{producto_id, cantidad, producto}]`.
// `producto` prioriza el documento vivo de Sanity (por si cambió nombre/foto
// después de la compra); si ya no existe, cae al snapshot guardado en el pedido.
export async function resolverItemsPedidos(pedidos) {
  const lista = pedidos || []
  const idsSet = new Set()
  lista.forEach(p => extraerLineas(p).forEach(l => idsSet.add(l.producto_id)))
  const ids = Array.from(idsSet)

  const productos = ids.length > 0 ? await getProductosPorIds(ids) : []
  const productosMap = {}
  productos.forEach(p => { productosMap[p._id] = p })

  return lista.map(pedido => ({
    ...pedido,
    lineas: extraerLineas(pedido).map(l => {
      const productoVivo = productosMap[l.producto_id] || null
      const producto = productoVivo || (l.nombreSnapshot
        ? { _id: l.producto_id, nombre: l.nombreSnapshot, precio: l.precioSnapshot, imagenUrl: l.imagenSnapshot }
        : null)
      return { ...l, producto }
    }),
  }))
}
