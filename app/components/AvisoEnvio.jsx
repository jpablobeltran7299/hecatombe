import { COSTO_ENVIO_MXN } from '@/lib/constants'

// Aviso reutilizable: costo de envío si el cliente no guarda sus piezas en Bodegatombe.
export default function AvisoEnvio({ variant = 'full', className = '' }) {
  if (variant === 'compact') {
    return (
      <p className={`text-ink-muted text-[11px] leading-tight ${className}`}>
        🚚 ${COSTO_ENVIO_MXN} envío si no usas Bodegatombe
      </p>
    )
  }

  return (
    <p className={`text-ink-muted text-xs ${className}`}>
      🚚 Si no eliges guardar tus piezas en <span className="font-bold">Bodegatombe</span>, se cobran ${COSTO_ENVIO_MXN} MXN de envío.
    </p>
  )
}
