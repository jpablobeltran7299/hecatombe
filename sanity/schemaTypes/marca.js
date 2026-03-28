export default {
  name: 'marca',
  title: 'Marca',
  type: 'document',
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