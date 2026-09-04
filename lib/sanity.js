import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'

// "The Hunger Games" -> "the-hunger-games"
export function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
})

const builder = imageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}

const CAMPOS_DESCUENTO = `descuentoActivo, descuentoTipo, descuentoValor, descuentoInicio, descuentoFin,`

// Calcula el precio final de un producto tomando en cuenta su descuento (si está activo y vigente)
export function calcularPrecioFinal(producto) {
  const precio = producto?.precio
  if (!precio || !producto?.descuentoActivo || !producto?.descuentoValor) {
    return { precioFinal: precio, enOferta: false, porcentajeOff: 0 }
  }

  const ahora = new Date()
  if (producto.descuentoInicio && ahora < new Date(producto.descuentoInicio)) {
    return { precioFinal: precio, enOferta: false, porcentajeOff: 0 }
  }
  if (producto.descuentoFin && ahora > new Date(`${producto.descuentoFin}T23:59:59`)) {
    return { precioFinal: precio, enOferta: false, porcentajeOff: 0 }
  }

  const bruto = producto.descuentoTipo === 'fijo'
    ? precio - producto.descuentoValor
    : precio * (1 - producto.descuentoValor / 100)
  const precioFinal = Math.max(0, Math.round(bruto))
  const porcentajeOff = Math.round((1 - precioFinal / precio) * 100)

  return { precioFinal, enOferta: precioFinal < precio, porcentajeOff }
}

export async function getProductosDestacados() {
  return client.fetch(`
    *[_type == "producto" && destacado == true && activo != false] | order(ordenDestacado asc, _createdAt desc) {
      _id, _createdAt, nombre, precio, disponible, imagenes,
      "marca": marca->nombre,
      "categoria": categoria->nombre,
      ${CAMPOS_DESCUENTO}
      tipo, ultimasPiezas, stock, ordenDestacado
    }
  `)
}

export async function getTodosProductos() {
  return client.fetch(`
    *[_type == "producto" && activo != false] | order(_createdAt desc) {
      _id, _createdAt, nombre, precio, disponible, imagenes,
      "marca": marca->nombre,
      "categoria": categoria->nombre,
      "tematica": tematica->nombre,
      "universo": universo->nombre,
      "linea": linea->nombre,
      ${CAMPOS_DESCUENTO}
      tipo, ultimasPiezas, mlUrl, stock, anticipo
    }
  `)
}

// Igual que getTodosProductos pero sin filtrar por "activo" — para la sección
// admin/productos, que necesita poder ver y reactivar productos desactivados.
export async function getTodosProductosParaAdmin() {
  return client.fetch(`
    *[_type == "producto"] | order(_createdAt desc) {
      _id, _createdAt, nombre, precio, disponible, activo, imagenes,
      "marca": marca->nombre,
      "categoria": categoria->nombre,
      "tematica": tematica->nombre,
      "universo": universo->nombre,
      "linea": linea->nombre,
      ${CAMPOS_DESCUENTO}
      tipo, ultimasPiezas, mlUrl, stock, anticipo
    }
  `)
}

export async function getMarcas() {
  return client.fetch(`*[_type == "marca"]{ _id, nombre, logo }`)
}

export async function getCategorias() {
  return client.fetch(`*[_type == "categoria"]{ _id, nombre, imagen }`)
}

export async function getProducto(id) {
  return client.fetch(`*[_type == "producto" && _id == $id][0]{
    _id, nombre, descripcion, precio, disponible, activo, destacado, ultimasPiezas, ordenDestacado,
    "marca": marca->nombre,
    "categoria": categoria->nombre,
    "tematica": tematica->nombre,
    "universo": universo->nombre,
    "linea": linea->nombre,
    ${CAMPOS_DESCUENTO}
    imagenes, mlUrl, tipo, fechaEstimada, anticipo, precioLiquidacion, stock
  }`, { id })
}

export async function getPreventas() {
  return client.fetch(`*[_type == "producto" && tipo == "preventa" && activo != false]
    | order(_createdAt desc){
      _id, nombre, precio, fechaEstimada, anticipo, precioLiquidacion,
      "marca": marca->nombre,
      imagenes
    }`)
}

export async function getDinamicas() {
  return client.fetch(`
    *[_type == "dinamica"] | order(_createdAt desc) {
      _id, titulo, descripcion, tipo, imagen, fechaFin,
      enlace, activa, numerosTotal, numerosVendidos, precio, destacada
    }
  `)
}

export async function getConfiguracion() {
  return client.fetch(`*[_type == "configuracion"][0]{ heroStat }`)
}

export async function getTematicas() {
  return client.fetch(`*[_type == "tematica"] | order(nombre asc){ _id, nombre }`)
}

export async function getLineas() {
  return client.fetch(`*[_type == "linea"] | order(nombre asc){ _id, nombre }`)
}

export async function getUniversos() {
  return client.fetch(`*[_type == "universo"] | order(nombre asc){ _id, nombre }`)
}

export async function getProductosPorIds(ids) {
  if (!ids || ids.length === 0) return []
  return client.fetch(`
    *[_type == "producto" && _id in $ids] {
      _id, nombre, precio, imagenes,
      "marca": marca->nombre,
      ${CAMPOS_DESCUENTO}
      tipo
    }
  `, { ids })
}

export async function getBanners() {
  return client.fetch(
    `*[_type == "banner" && activo == true] | order(orden asc) {
      _id, tag, titulo, subtitulo, cta, href, imagen, orden, mostrarTexto
    }`
  )
}