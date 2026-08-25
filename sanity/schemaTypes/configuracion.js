// schemas/configuracion.js
// Documento singleton — un único registro con _id fijo ("configuracion")
export default {
  name: 'configuracion',
  title: 'Configuración del sitio',
  type: 'document',
  fields: [
    {
      name: 'heroStat',
      title: 'Bloque de estadística (hero del home)',
      type: 'object',
      fields: [
        {
          name: 'mostrar',
          title: 'Mostrar',
          type: 'boolean',
          initialValue: true
        },
        {
          name: 'texto',
          title: 'Texto',
          type: 'string',
          description: 'Ej: "800+ Productos"',
          initialValue: '800+ Productos'
        },
        {
          name: 'link',
          title: 'Link (ruta interna)',
          type: 'string',
          description: 'Ej: /catalogo, /dinamicas, /producto/xxxx. Déjalo vacío para que el bloque no sea clickeable.'
        }
      ]
    }
  ],
  preview: {
    prepare() {
      return { title: 'Configuración del sitio' }
    }
  }
}
