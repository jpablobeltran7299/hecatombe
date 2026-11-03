// Una "promoción" es un preset de descuento masivo guardado (nombre, tipo,
// valor, a qué productos aplica) que el admin puede prender/apagar con un
// switch desde /admin/promociones sin tener que volver a seleccionar
// productos cada vez (ver app/api/admin/promociones/[id]/toggle/route.js).
//
// `activa` y `productosAfectados` los escribe SOLO ese endpoint — no están
// pensados para editarse a mano desde el Studio.
export default {
  name: 'promocion',
  title: 'Promoción',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      description: 'Ej: "Buen Fin 2026" — solo para identificarla en el panel.',
      validation: Rule => Rule.required(),
    },
    {
      name: 'tipo',
      title: 'Tipo de descuento',
      type: 'string',
      options: {
        list: [
          { title: 'Porcentaje (%)', value: 'porcentaje' },
          { title: 'Monto fijo ($)', value: 'fijo' },
        ],
        layout: 'radio',
      },
      initialValue: 'porcentaje',
      validation: Rule => Rule.required(),
    },
    {
      name: 'valor',
      title: 'Valor del descuento',
      type: 'number',
      description: 'Si es porcentaje: número del 1 al 100. Si es monto fijo: pesos MXN a restar del precio.',
      validation: Rule => Rule.required().positive(),
    },
    {
      name: 'alcance',
      title: 'Alcance',
      type: 'string',
      options: {
        list: [
          { title: 'Todo el catálogo activo', value: 'catalogo' },
          { title: 'Productos específicos', value: 'seleccion' },
        ],
        layout: 'radio',
      },
      initialValue: 'catalogo',
      validation: Rule => Rule.required(),
    },
    {
      name: 'productos',
      title: 'Productos incluidos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'producto' }] }],
      hidden: ({ document }) => document?.alcance !== 'seleccion',
    },
    {
      name: 'activa',
      title: 'Activa',
      type: 'boolean',
      initialValue: false,
      readOnly: true,
      description: 'Se controla desde el switch en /admin/promociones, no desde aquí.',
    },
    {
      name: 'productosAfectados',
      title: 'Productos afectados (snapshot)',
      type: 'array',
      of: [{ type: 'string' }],
      readOnly: true,
      description: 'IDs de los productos a los que se les aplicó el descuento la última vez que se activó. Se usa para poder apagarla correctamente aunque el catálogo haya cambiado mientras tanto.',
    },
  ],
  preview: {
    select: { title: 'nombre', tipo: 'tipo', valor: 'valor', activa: 'activa' },
    prepare({ title, tipo, valor, activa }) {
      return {
        title,
        subtitle: `${activa ? '🟢 Activa' : '⚪ Inactiva'} — ${tipo === 'fijo' ? `$${valor}` : `${valor}%`} de descuento`,
      }
    },
  },
}
