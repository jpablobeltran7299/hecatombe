import { getProductosPorIds } from './sanity'

// Un pedido normal/liquidación trae `items: [{producto_id, cantidad}]`.
// Un apartado o un pedido de bodega insertado manualmente trae solo la
// columna singular `producto_id` (un solo producto, cantidad 1).
function extraerLineas(pedido) {
  if (Array.isArray(pedido.items) && pedido.items.length > 0) {
    return pedido.items
      .filter(it => it?.producto_id)
      .map(it => ({ producto_id: it.producto_id, cantidad: it.cantidad || 1 }))
  }
  if (pedido.producto_id) {
    return [{ producto_id: pedido.producto_id, cantidad: 1 }]
  }
  return []
}

// Junta los producto_id de una lista de pedidos, los resuelve UNA sola vez
// contra Sanity, y devuelve los mismos pedidos con `lineas: [{producto_id, cantidad, producto}]`.
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
    lineas: extraerLineas(pedido).map(l => ({ ...l, producto: productosMap[l.producto_id] || null })),
  }))
}
