export default {
  name: 'producto',
  title: 'Producto',
  type: 'document',
  fields: [
    {
      name: 'mlUrl',
      title: 'URL en Mercado Libre',
      type: 'url',
      description: 'Link del producto en Mercado Libre (opcional)',
    },
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'imagenes',
      title: 'Imágenes',
      type: 'array',
      of: [{ type: 'image' }]
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
    },
    {
      name: 'precio',
      title: 'Precio referencia',
      type: 'number',
    },
    {
      name: 'marca',
      title: 'Marca',
      type: 'reference',
      to: [{ type: 'marca' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'categoria',
      title: 'Categoría',
      type: 'reference',
      to: [{ type: 'categoria' }],
      validation: Rule => Rule.required()
    },
    {
      name: 'tematica',
      title: 'Temática',
      type: 'reference',
      to: [{ type: 'tematica' }],
    },
    {
      name: 'universo',
      title: 'Universo',
      type: 'reference',
      to: [{ type: 'universo' }],
    },
    {
      name: 'linea',
      title: 'Línea de producto',
      type: 'reference',
      to: [{ type: 'linea' }],
    },
    {
      name: 'stock',
      title: 'Stock disponible',
      type: 'number',
      description: 'Número de piezas disponibles. Cuando llegue a 0 el producto se ocultará automáticamente de la tienda. Deja vacío si no quieres llevar control de stock.',
      validation: Rule => Rule.min(0).integer(),
    },
    {
      name: 'disponible',
      title: 'Disponible',
      type: 'boolean',
      initialValue: true,
      description: 'Si tienes stock configurado, este campo se actualiza automáticamente. Si no usas stock, manéjalo manualmente.',
    },
    {
      name: 'destacado',
      title: 'Destacado (aparece en el home)',
      type: 'boolean',
      initialValue: false
    },
    {
      name: 'ordenDestacado',
      title: 'Orden en destacados',
      type: 'number',
      description: 'Número de orden en el carrusel de destacados del home. Ej: 1 = primero, 2 = segundo...',
      hidden: ({ document }) => !document?.destacado,
    },
    {
      name: 'tipo',
      title: 'Tipo',
      type: 'string',
      options: {
        list: [
          { title: 'Normal', value: 'normal' },
          { title: 'Preventa', value: 'preventa' },
        ],
        layout: 'radio'
      },
      initialValue: 'normal'
    },
    {
      name: 'fechaEstimada',
      title: 'Fecha estimada de llegada (preventas)',
      type: 'date',
      hidden: ({ document }) => document?.tipo !== 'preventa'
    },
    {
      name: 'anticipo',
      title: 'Monto de anticipo (preventas)',
      type: 'number',
      description: 'Monto en pesos MXN que el cliente paga para apartar. Ej: 120',
      hidden: ({ document }) => document?.tipo !== 'preventa'
    },
    {
      name: 'precioLiquidacion',
      title: 'Precio de liquidación (preventas)',
      type: 'number',
      description: 'Monto restante a pagar cuando llegue el producto. Si se deja vacío se calcula como precio - anticipo.',
      hidden: ({ document }) => document?.tipo !== 'preventa'
    },
    {
      name: 'activo',
      title: 'Activo (visible en tienda)',
      type: 'boolean',
      initialValue: true,
      description: 'Desactiva para ocultar el producto de la tienda sin eliminarlo.',
    },
    {
      name: 'ultimasPiezas',
      title: 'Últimas piezas',
      type: 'boolean',
      initialValue: false,
      description: 'Activa el badge "Últimas piezas" en el catálogo'
    },
  ]
}