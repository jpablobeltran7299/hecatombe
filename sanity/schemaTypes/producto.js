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
      name: 'disponible',
      title: 'Disponible',
      type: 'boolean',
      initialValue: true
    },
    {
      name: 'destacado',
      title: 'Destacado (aparece en el home)',
      type: 'boolean',
      initialValue: false
    }
  ]
}