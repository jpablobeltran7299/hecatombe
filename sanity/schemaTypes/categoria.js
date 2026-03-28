export default {
  name: 'categoria',
  title: 'Categoría',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
    }
  ]
}