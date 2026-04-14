// schemas/dinamica.js
export default {
  name: 'dinamica',
  title: 'Dinámica',
  type: 'document',
  fields: [
    {
      name: 'titulo',
      title: 'Título',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'descripcion',
      title: 'Descripción',
      type: 'text',
      rows: 3
    },
    {
      name: 'tipo',
      title: 'Tipo',
      type: 'string',
      options: {
        list: [
          { title: 'Rifa', value: 'rifa' },
          { title: 'Concurso', value: 'concurso' },
          { title: 'Flash Sale', value: 'flash_sale' },
          { title: 'Trivia', value: 'trivia' }
        ],
        layout: 'radio'
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'imagen',
      title: 'Imagen',
      type: 'image',
      options: { hotspot: true }
    },
    {
      name: 'fechaFin',
      title: 'Fecha de cierre',
      type: 'datetime'
    },
    {
      name: 'enlace',
      title: 'Enlace (WhatsApp / Instagram / externo)',
      type: 'url'
    },
    {
      name: 'activa',
      title: 'Activa',
      type: 'boolean',
      initialValue: true
    },
    // — Solo para rifas —
    {
      name: 'numerosTotal',
      title: 'Total de números (rifas)',
      type: 'number',
      hidden: ({ document }) => document?.tipo !== 'rifa'
    },
    {
      name: 'numerosVendidos',
      title: 'Números vendidos (rifas)',
      type: 'array',
      of: [{ type: 'number' }],
      hidden: ({ document }) => document?.tipo !== 'rifa'
    }
  ],
  preview: {
    select: { title: 'titulo', subtitle: 'tipo', media: 'imagen' }
  }
}