import { HECACOINS_RATE } from '@/lib/constants'

// Muestra "Ganaste X HC con este pedido" — mismo cálculo que el webhook de pagos
// (3% del total, solo para pedidos normales/liquidación, no apartados).
export default function HecacoinsEarnedNote({ pedido, className = '' }) {
  const tipo = pedido?.tipo_pedido || 'normal'
  const elegible = tipo === 'normal' || tipo === 'liquidacion'
  if (!elegible) return null

  const ganadas = Math.floor((pedido?.total || 0) * HECACOINS_RATE)
  if (ganadas <= 0) return null

  return (
    <p className={`text-xs text-ink/40 ${className}`}>
      🪙 Ganaste <span className="text-orange-500 font-black">{ganadas.toLocaleString('es-MX')} HC</span> con este pedido
    </p>
  )
}
