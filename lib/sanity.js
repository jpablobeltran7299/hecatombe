import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'


export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: true,
})

const builder = imageUrlBuilder(client)

export function urlFor(source) {
  return builder.image(source)
}

export async function getProductosDestacados() {
  return client.fetch(`*[_type == "producto" && destacado == true]{
    _id, nombre, descripcion, precio, disponible,
    "marca": marca->nombre,
    "categoria": categoria->nombre,
    imagenes
  }`)
}

export async function getTodosProductos() {
  return client.fetch(`*[_type == "producto"]{
    _id, nombre, descripcion, precio, disponible,
    "marca": marca->nombre,
    "categoria": categoria->nombre,
    imagenes
  }`)
}

export async function getMarcas() {
  return client.fetch(`*[_type == "marca"]{ _id, nombre, logo }`)
}

export async function getCategorias() {
  return client.fetch(`*[_type == "categoria"]{ _id, nombre, imagen }`)
}

export async function getProducto(id) {
  return client.fetch(`*[_type == "producto" && _id == $id][0]{
    _id, nombre, descripcion, precio, disponible,
    "marca": marca->nombre,
    "categoria": categoria->nombre,
    imagenes
  }`, { id })
}

export async function getPreventas() {
  return client.fetch(`*[_type == "producto" && tipo == "preventa" && activo != false]
    | order(_createdAt desc)[0...6]{
      _id, nombre, precio, fechaEstimada,
      "marca": marca->nombre,
      imagenes
    }`)
}

export async function getDinamicas() {
  return client.fetch(`*[_type == "dinamica" && activa == true]
    | order(fechaFin asc)[0...4]{
      _id, titulo, descripcion, tipo, fechaFin, enlace
    }`)
}

export async function getBanners() {
  return client.fetch(
    `*[_type == "banner" && activo == true] | order(orden asc) {
      _id,
      tag,
      titulo,
      subtitulo,
      cta,
      href,
      imagen,
      orden
    }`
  );
}
