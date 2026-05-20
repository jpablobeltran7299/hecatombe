// importar_productos.js
// Uso: node importar_productos.js
// Requiere: npm install @sanity/client xlsx

const { createClient } = require('@sanity/client')
const XLSX = require('xlsx')
const path = require('path')

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sken5HsIC8KHKHRGoZojawRjbEvqWWnbH8FOUUah254TOJlFxjiSCfefrxcjWYBEPR9Fk6Y3W7GSgRMSrLKDATFXTzz0mw02T46NVrDmE7hO63EFScnuE5U0VephTxOLf4IEbylEaQBmLjW5rN5b1CUtVqHo4OyRGDyeaqnQaLm6leCWD31e',
  useCdn: false,
})

// Limpia strings (quita espacios extra)
const limpiar = (str) => str?.toString().trim() || ''

async function obtenerOCrear(tipo, nombre) {
  if (!nombre) return null
  const nombreLimpio = limpiar(nombre)
  
  // Buscar si ya existe
  const existente = await client.fetch(
    `*[_type == $tipo && nombre == $nombre][0]{ _id }`,
    { tipo, nombre: nombreLimpio }
  )
  if (existente) return existente._id

  // Crear nuevo
  const doc = await client.create({ _type: tipo, nombre: nombreLimpio, orden: 0 })
  console.log(`  ✓ Creado ${tipo}: ${nombreLimpio}`)
  return doc._id
}

async function main() {
  // Leer Excel
  const workbook = XLSX.readFile(path.join(__dirname, 'Inventario_blanco.xlsx'))
  const sheet = workbook.Sheets['Hoja 2']
  const filas = XLSX.utils.sheet_to_json(sheet)

  console.log(`📦 ${filas.length} filas encontradas`)

  // Agrupar por producto único (nombre)
  const productosMap = new Map()
  for (const fila of filas) {
    const nombre = limpiar(fila['Artículo'])
    if (!nombre) continue
    if (!productosMap.has(nombre)) {
      productosMap.set(nombre, {
        nombre,
        categoria: limpiar(fila['Categoría']),
        universo: limpiar(fila['Universo']),
        linea: limpiar(fila['Tipo de artículo']),
        precio: fila['Precio General'] || null,
        stock: 1,
      })
    } else {
      productosMap.get(nombre).stock++
    }
  }

  const productos = Array.from(productosMap.values())
  console.log(`🎯 ${productos.length} productos únicos a importar\n`)

  let importados = 0
  let errores = 0

  for (const p of productos) {
    try {
      // Obtener o crear referencias
      const tematicaId = await obtenerOCrear('tematica', p.categoria)
      const universoId = await obtenerOCrear('universo', p.universo)
      const lineaId = await obtenerOCrear('linea', p.linea)

      // Construir documento
      const doc = {
        _type: 'producto',
        nombre: p.nombre,
        precio: p.precio ? Number(p.precio) : undefined,
        disponible: true,
        activo: true,
        destacado: false,
        tipo: 'normal',
        ultimasPiezas: false,
        // Tag para identificar productos importados (útil para borrado)
        importadoDesdeExcel: true,
      }

      if (tematicaId) doc.tematica = { _type: 'reference', _ref: tematicaId }
      if (universoId) doc.universo = { _type: 'reference', _ref: universoId }
      if (lineaId) doc.linea = { _type: 'reference', _ref: lineaId }

      await client.create(doc)
      importados++
      if (importados % 50 === 0) console.log(`  ⏳ ${importados}/${productos.length} importados...`)
    } catch (err) {
      console.error(`  ✗ Error en "${p.nombre}": ${err.message}`)
      errores++
    }
  }

  console.log(`\n✅ Importación completa: ${importados} productos importados, ${errores} errores`)
}

main().catch(console.error)
