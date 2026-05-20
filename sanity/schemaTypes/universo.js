export default {
  name: 'universo',
  title: 'Universo',
  type: 'document',
  fields: [
    {
      name: 'nombre',
      title: 'Nombre',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'orden',
      title: 'Orden de aparición',
      type: 'number',
      initialValue: 0
    }
  ],
  preview: {
    select: { title: 'nombre' }
  }
}