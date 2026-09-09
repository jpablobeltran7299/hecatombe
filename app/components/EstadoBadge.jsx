import { getBadgeClasses, getEstadoLabel } from '@/lib/estadoPedido'

export default function EstadoBadge({ estado, className = '' }) {
  return (
    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full whitespace-nowrap ${getBadgeClasses(estado)} ${className}`}>
      {getEstadoLabel(estado)}
    </span>
  )
}
