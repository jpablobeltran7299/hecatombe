// Una "promoción" es un preset de descuento guardado que el admin puede
// prender/apagar con un switch desde /admin/promociones. Hay dos
// modalidades, que comparten la misma pantalla y el mismo switch:
//
// - "producto": % o $ fijo aplicado al precio de ciertos productos (o todo
//   el catálogo). Al prender, escribe descuentoActivo/Tipo/Valor en los
//   productos del alcance elegido (ver .../promociones/[id]/toggle/route.js).
// - "escalonado": % de descuento sobre el total del carrito según el monto
//   comprado (ej. "+$500 → 10% OFF"). No toca productos — se evalúa en
//   app/api/checkout/route.js contra el subtotal real (antes de envío).
//   Solo puede haber UNA activa a la vez (el toggle lo valida).
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
      name: 'modalidad',
      title: 'Modalidad',
      type: 'string',
      options: {
        list: [
          { title: 'Descuento por producto', value: 'producto' },
          { title: 'Descuento escalonado por monto de compra', value: 'escalonado' },
        ],
        layout: 'radio',
      },
      initialValue: 'producto',
      validation: Rule => Rule.required(),
    },

    // --- Modalidad "producto" ---
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
      hidden: ({ document }) => document?.modalidad === 'escalonado',
    },
    {
      name: 'valor',
      title: 'Valor del descuento',
      type: 'number',
      description: 'Si es porcentaje: número del 1 al 100. Si es monto fijo: pesos MXN a restar del precio.',
      hidden: ({ document }) => document?.modalidad === 'escalonado',
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
      hidden: ({ document }) => document?.modalidad === 'escalonado',
    },
    {
      name: 'productos',
      title: 'Productos incluidos',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'producto' }] }],
      hidden: ({ document }) => document?.modalidad === 'escalonado' || document?.alcance !== 'seleccion',
    },

    // --- Modalidad "escalonado" ---
    {
      name: 'escalones',
      title: 'Escalones de descuento',
      type: 'array',
      description: 'Ej: desde $500 de compra → 10% de descuento sobre el valor de los productos (sin envío). Se aplica solo en compras normales, usando el escalón más alto que alcance.',
      of: [{
        type: 'object',
        name: 'escalon',
        fields: [
          { name: 'minimo', title: 'Monto mínimo de compra (MXN)', type: 'number', validation: Rule => Rule.required().min(0) },
          { name: 'porcentaje', title: 'Porcentaje de descuento', type: 'number', validation: Rule => Rule.required().min(1).max(100) },
        ],
        preview: {
          select: { minimo: 'minimo', porcentaje: 'porcentaje' },
          prepare({ minimo, porcentaje }) {
            return { title: `+$${minimo} → ${porcentaje}% OFF` }
          },
        },
      }],
      hidden: ({ document }) => document?.modalidad !== 'escalonado',
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
      description: 'Solo aplica a la modalidad "producto". IDs de los productos a los que se les aplicó el descuento la última vez que se activó.',
    },
  ],
  preview: {
    select: { title: 'nombre', modalidad: 'modalidad', tipo: 'tipo', valor: 'valor', activa: 'activa', escalones: 'escalones' },
    prepare({ title, modalidad, tipo, valor, activa, escalones }) {
      const detalle = modalidad === 'escalonado'
        ? `Escalonado (${(escalones || []).length} nivel(es))`
        : `${tipo === 'fijo' ? `$${valor}` : `${valor}%`} de descuento`
      return {
        title,
        subtitle: `${activa ? '🟢 Activa' : '⚪ Inactiva'} — ${detalle}`,
      }
    },
  },
}
