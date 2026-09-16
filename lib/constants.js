// Correos con acceso al panel de administración.
export const ADMINS = ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com']

// Monto acumulado en Bodegatombe para obtener envío gratis.
export const BODEGA_THRESHOLD_MXN = 1200

// Costo de envío cuando el cliente no elige guardar sus piezas en Bodegatombe.
export const COSTO_ENVIO_MXN = 180

// Porcentaje de Hecacoins que se gana por cada compra (normal/liquidación).
export const HECACOINS_RATE = 0.03

// Medida de referencia para productos sin peso/dimensiones capturados en
// Sanity (ej. los creados antes de agregar esos campos) — típica caja de
// Funko Pop estándar.
export const PAQUETE_POR_DEFECTO = { peso: 0.2, alto: 15, ancho: 10, largo: 10 }

// Código de Carta Porte (catálogo SAT) para lo que vendemos — "Coleccionables".
// Lo pide Solo Envíos para generar guías de envíos nacionales en México.
export const CARTA_PORTE_COLECCIONABLES = '49101600'

// Tipo de empaque por defecto al generar una guía — "Box" en el catálogo
// de Solo Envíos.
export const TIPO_EMPAQUE_CAJA = '4G'
