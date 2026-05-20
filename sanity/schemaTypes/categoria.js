export default {
  name: 'categoria',
  title: 'Categoría',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
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