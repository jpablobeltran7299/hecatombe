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
      type: 'string',
      options: {
        list: [
          { title: 'Anime', value: 'anime' },
          { title: 'Disney', value: 'disney' },
          { title: 'Películas', value: 'peliculas' },
          { title: 'Series', value: 'series' },
          { title: 'Videojuegos', value: 'videojuegos' },
          { title: 'Animación', value: 'animacion' },
          { title: 'Deportes', value: 'deportes' },
          { title: 'Música', value: 'musica' },
          { title: 'Marvel', value: 'marvel' },
          { title: 'DC Comics', value: 'dc' },
          { title: 'Star Wars', value: 'starwars' },
          { title: 'Harry Potter', value: 'harrypotter' },
          { title: 'Horror', value: 'horror' },
          { title: 'Otros', value: 'otros' },
        ],
        layout: 'dropdown'
      }
    },
    {
      name: 'linea',
      title: 'Línea de producto',
      type: 'string',
      options: {
        list: [
          { title: 'POP', value: 'pop' },
          { title: 'POP Animation', value: 'pop_animation' },
          { title: 'POP Movies', value: 'pop_movies' },
          { title: 'POP Games', value: 'pop_games' },
          { title: 'POP TV', value: 'pop_tv' },
          { title: 'POP Sports', value: 'pop_sports' },
          { title: 'POP Rides', value: 'pop_rides' },
          { title: 'Bitty POP', value: 'bitty_pop' },
          { title: 'POP Keychain', value: 'pop_keychain' },
          { title: 'Figura de acción', value: 'figura_accion' },
          { title: 'Estatua', value: 'estatua' },
          { title: 'Peluche', value: 'peluche' },
          { title: 'Accesorio', value: 'accesorio' },
          { title: 'Otro', value: 'otro' },
        ],
        layout: 'dropdown'
      }
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
      name: 'activo',
      title: 'Activo (visible en tienda)',
      type: 'boolean',
      initialValue: true
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