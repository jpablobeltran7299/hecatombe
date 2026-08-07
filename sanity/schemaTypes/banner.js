export default {
  name: "banner",
  title: "Banners",
  type: "document",
  fields: [
    {
      name: "imagen",
      title: "Imagen de fondo",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "mostrarTexto",
      title: "¿Mostrar texto sobre el banner?",
      type: "boolean",
      initialValue: false,
      description: "Activa esta opción si quieres mostrar título, subtítulo y botón encima de la imagen. Si lo dejas desactivado, la imagen se ve limpia sin nada encima.",
    },
    {
      name: "tag",
      title: "Etiqueta (ej: PREVENTA ACTIVA, FLASH SALE)",
      type: "string",
      validation: (Rule) => Rule.max(30),
      hidden: ({ document }) => !document?.mostrarTexto,
    },
    {
      name: "titulo",
      title: "Título principal",
      type: "string",
      validation: (Rule) => Rule.max(40),
      hidden: ({ document }) => !document?.mostrarTexto,
    },
    {
      name: "subtitulo",
      title: "Subtítulo",
      type: "string",
      validation: (Rule) => Rule.max(100),
      hidden: ({ document }) => !document?.mostrarTexto,
    },
    {
      name: "cta",
      title: "Texto del botón (ej: Ver Catálogo)",
      type: "string",
      hidden: ({ document }) => !document?.mostrarTexto,
    },
    {
      name: "href",
      title: "Link del botón (ej: /catalogo o /#preventas)",
      type: "string",
      hidden: ({ document }) => !document?.mostrarTexto,
    },
    {
      name: "orden",
      title: "Orden de aparición",
      type: "number",
      validation: (Rule) => Rule.required().min(1),
    },
    {
      name: "activo",
      title: "Activo",
      type: "boolean",
      initialValue: true,
    },
  ],
  preview: {
    select: {
      title: "titulo",
      subtitle: "tag",
      media: "imagen",
    },
  },
  orderings: [
    {
      title: "Orden de aparición",
      name: "ordenAsc",
      by: [{ field: "orden", direction: "asc" }],
    },
  ],
}