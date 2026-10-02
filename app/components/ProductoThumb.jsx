import { urlFor } from '@/lib/sanity'

// `imagenUrl` es el snapshot guardado en el pedido (URL directa, para cuando
// el producto ya se borró de Sanity) — tiene prioridad sobre `imagenes`
// (referencias de Sanity, que solo sirven si el documento sigue vivo).
export default function ProductoThumb({ imagenes, imagenUrl, nombre, size = 48 }) {
  const imagen = imagenes?.[0]

  if (imagenUrl) {
    return (
      <img
        src={imagenUrl}
        alt={nombre || 'Producto'}
        className="object-contain rounded-lg bg-white flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

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
