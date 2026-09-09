import { urlFor } from '@/lib/sanity'

export default function ProductoThumb({ imagenes, nombre, size = 48 }) {
  const imagen = imagenes?.[0]

  if (imagen) {
    return (
      <img
        src={urlFor(imagen).width(size * 2).height(size * 2).url()}
        alt={nombre || 'Producto'}
        className="object-contain rounded-lg bg-white flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className="bg-surface-alt rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      📦
    </div>
  )
}
