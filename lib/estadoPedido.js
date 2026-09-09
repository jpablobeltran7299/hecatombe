export function getBadgeClasses(estado) {
  switch (estado) {
    case 'pagado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
    case 'apartado': return 'bg-orange-500/10 text-orange-400 border border-orange-500/30'
    case 'liquidado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
    case 'enviado': return 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
    case 'entregado': return 'bg-green-500/10 text-green-400 border border-green-500/30'
    case 'cancelado': return 'bg-red-500/10 text-red-400 border border-red-500/30'
    default: return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
  }
}

export function getEstadoLabel(estado) {
  switch (estado) {
    case 'pagado': return '✅ Pagado'
    case 'apartado': return '🔒 Apartado'
    case 'liquidado': return '✅ Liquidado'
    case 'enviado': return '🚚 Enviado'
    case 'entregado': return '📬 Entregado'
    case 'cancelado': return '❌ Cancelado'
    default: return estado || 'Pendiente'
  }
}
