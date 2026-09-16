import { PAQUETE_POR_DEFECTO } from '@/lib/constants'

const MAX_PAQUETES = 20

// Arma la lista de "paquetes" (uno por pieza) que se manda a Solo Envíos,
// tomando peso/dimensiones de Sanity o el valor por defecto si el producto
// no los tiene capturados. items: [{ producto_id | productoId, cantidad }]
// productosMap: { [productoId]: productoDeSanity }
export function armarParcels(items, productosMap) {
  const parcels = []
  for (const item of items) {
    const producto = productosMap[item.producto_id || item.productoId]
    const medida = {
      weight: producto?.peso || PAQUETE_POR_DEFECTO.peso,
      length: producto?.largo || PAQUETE_POR_DEFECTO.largo,
      width: producto?.ancho || PAQUETE_POR_DEFECTO.ancho,
      height: producto?.alto || PAQUETE_POR_DEFECTO.alto,
    }
    for (let i = 0; i < (item.cantidad || 1); i++) {
      if (parcels.length >= MAX_PAQUETES) {
        // No debería pasar con pedidos normales — si pasa, mejor que quede
        // en los logs que cotizar/enviar solo el resto en silencio.
        console.warn(`armarParcels: se truncó a ${MAX_PAQUETES} paquetes (pedido con más piezas de las esperadas)`)
        return parcels
      }
      parcels.push(medida)
    }
  }
  return parcels
}

// Formatea las tarifas crudas de Solo Envíos al shape que consume el
// frontend, ordenadas de más barata a más cara.
export function formatearTarifas(tarifas) {
  return tarifas
    .map(r => ({
      rateId: r.id,
      proveedor: r.provider_display_name,
      servicio: r.provider_service_name,
      total: parseFloat(r.total),
      dias: r.days,
    }))
    .sort((a, b) => a.total - b.total)
}
