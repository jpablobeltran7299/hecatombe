export default {
  name: 'marca',
  title: 'Marca',
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
      name: 'logo',
      title: 'Logo',
      type: 'image',
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
    }
  ]
}