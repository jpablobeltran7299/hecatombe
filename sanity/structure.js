export const structure = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('producto').title('Producto'),
      S.documentTypeListItem('banner').title('Banners'),
      S.documentTypeListItem('dinamica').title('Dinámica'),
      S.documentTypeListItem('tematica').title('Temática'),
      S.documentTypeListItem('linea').title('Línea de producto'),
      S.documentTypeListItem('universo').title('Universo'),
    ])