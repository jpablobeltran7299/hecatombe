import ProductoThumb from './ProductoThumb'

// Lista compacta de productos de un pedido, con miniatura + nombre + cantidad.
// `lineas` viene de lib/pedidos.js -> resolverItemsPedidos: [{producto_id, cantidad, producto}]
export default function PedidoItemsList({ lineas, max = 3, size = 48 }) {
  if (!lineas || lineas.length === 0) return null

  const visibles = lineas.slice(0, max)
  const restantes = lineas.length - visibles.length

  return (
    <div className="flex flex-col gap-2">
      {visibles.map((linea, i) => (
        <div key={`${linea.producto_id}-${i}`} className="flex items-center gap-3 min-w-0">
          <ProductoThumb imagenes={linea.producto?.imagenes} nombre={linea.producto?.nombre} size={size} />
          <div className="flex-1 min-w-0">
            <p className="text-ink text-xs font-black truncate">{linea.producto?.nombre || 'Producto no disponible'}</p>
            {linea.cantidad > 1 && <p className="text-ink/30 text-xs">Cantidad: {linea.cantidad}</p>}
          </div>
        </div>
      ))}
      {restantes > 0 && (
        <p className="text-ink/30 text-xs font-black uppercase">+{restantes} producto{restantes > 1 ? 's' : ''} más</p>
      )}
    </div>
  )
}
