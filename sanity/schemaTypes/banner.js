// schemas/banner.js
// Agregar este archivo en la carpeta schemas/ de tu Sanity Studio
// y registrarlo en schemas/index.js

export default {
  name: "banner",
  title: "Banners",
  type: "document",
  fields: [
    {
      name: "tag",
      title: "Etiqueta (ej: PREVENTA ACTIVA, FLASH SALE)",
      type: "string",
      validation: (Rule) => Rule.required().max(30),
    },
    {
      name: "titulo",
      title: "Título principal",
      type: "string",
      validation: (Rule) => Rule.required().max(40),
    },
    {
      name: "subtitulo",
      title: "Subtítulo",
      type: "string",
      validation: (Rule) => Rule.max(100),
    },
    {
      name: "cta",
      title: "Texto del botón (ej: Ver Catálogo)",
      type: "string",
    },
    {
      name: "href",
      title: "Link del botón (ej: /catalogo o /#preventas)",
      type: "string",
    },
    {
      name: "imagen",
      title: "Imagen de fondo",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
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
};
