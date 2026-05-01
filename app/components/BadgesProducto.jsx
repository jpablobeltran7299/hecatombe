export default function BadgesProducto({ producto }) {
  const badges = []

  if (producto.tipo === 'preventa') {
    badges.push({ label: 'Preventa', bg: '#1e40af', color: '#93c5fd' })
  }

  if (producto.ultimasPiezas && producto.disponible) {
    badges.push({ label: 'Últimas piezas', bg: '#78350f', color: '#fcd34d' })
  }

  if (!producto.disponible) {
    badges.push({ label: 'Agotado', bg: '#1f1f1f', color: '#6b7280' })
  }

  // Badge NUEVO — productos creados hace menos de 30 días
  if (producto._createdAt) {
    const dias = (Date.now() - new Date(producto._createdAt)) / (1000 * 60 * 60 * 24)
    if (dias < 30 && producto.tipo !== 'preventa') {
      badges.push({ label: 'Nuevo', bg: '#14532d', color: '#86efac' })
    }
  }

  if (!badges.length) return null

  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
      {badges.map((b) => (
        <span
          key={b.label}
          style={{ backgroundColor: b.bg, color: b.color }}
          className="text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}