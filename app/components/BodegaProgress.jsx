import { BODEGA_THRESHOLD_MXN } from '@/lib/constants'

// Barra de progreso hacia el envío gratis de Bodegatombe.
// showLabel/showMensaje se pueden ocultar para usos compactos (ej. tarjetas pequeñas).
export default function BodegaProgress({
  total = 0,
  threshold = BODEGA_THRESHOLD_MXN,
  showLabel = true,
  showMensaje = true,
  height = 12,
}) {
  const falta = Math.max(0, threshold - total)
  const porcentaje = Math.min(100, (total / threshold) * 100)

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-ink/50 text-xs font-black uppercase">Acumulado</span>
          <span className="text-orange-600 font-black">
            ${total.toLocaleString('es-MX')} / ${threshold.toLocaleString('es-MX')} MXN
          </span>
        </div>
      )}
      <div className="w-full bg-surface-alt rounded-full" style={{ height }}>
        <div
          className="bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${porcentaje}%`, height }}
        />
      </div>
      {showMensaje && (
        <div className="mt-2">
          {falta === 0 ? (
            <p className="text-green-400 text-sm font-black">🎉 ¡Ya tienes envío gratis disponible!</p>
          ) : (
            <p className="text-ink/40 text-sm">
              Te faltan <span className="text-orange-600 font-black">${falta.toLocaleString('es-MX')} MXN</span> para envío gratis.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
