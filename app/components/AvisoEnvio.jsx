import { COSTO_ENVIO_MXN, BODEGA_THRESHOLD_MXN } from '@/lib/constants'

// Aviso reutilizable: costo de envío si el cliente no guarda sus piezas en Bodegatombe.
export default function AvisoEnvio({ variant = 'full', className = '' }) {
  if (variant === 'compact') {
    return (
      <p className={`text-ink-muted text-[11px] leading-tight ${className}`}>
        🚚 Envío desde ${COSTO_ENVIO_MXN}<br />
        📦 ¿Quieres ahorrártelo? Guarda tu pedido en <span className="font-black">Bodegatombe</span>, junta ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')} en compras y tu envío sale <span className="font-black">GRATIS</span>
      </p>
    )
  }

  return (
    <div className={`text-ink-muted text-xs ${className}`}>
      <p>🚚 Envío desde ${COSTO_ENVIO_MXN}</p>
      <p className="mt-1">📦 ¿Quieres ahorrártelo? Guarda tu pedido en <span className="font-black">Bodegatombe</span>, junta ${BODEGA_THRESHOLD_MXN.toLocaleString('es-MX')} en compras y tu envío sale <span className="font-black">GRATIS</span></p>
    </div>
  )
}
