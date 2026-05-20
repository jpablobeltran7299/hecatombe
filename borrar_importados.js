// borrar_importados.js
// Borra TODOS los productos que fueron importados desde Excel
// Uso: node borrar_importados.js

const { createClient } = require('@sanity/client')

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sken5HsIC8KHKHRGoZojawRjbEvqWWnbH8FOUUah254TOJlFxjiSCfefrxcjWYBEPR9Fk6Y3W7GSgRMSrLKDATFXTzz0mw02T46NVrDmE7hO63EFScnuE5U0VephTxOLf4IEbylEaQBmLjW5rN5b1CUtVqHo4OyRGDyeaqnQaLm6leCWD31e',
  useCdn: false,
})

async function main() {
  console.log('🔍 Buscando productos importados desde Excel...')
  
  const productos = await client.fetch(
    `*[_type == "producto" && importadoDesdeExcel == true]{ _id, nombre }`
  )

  if (productos.length === 0) {
    console.log('No hay productos importados para borrar.')
    return
  }

  console.log(`🗑️  ${productos.length} productos encontrados. Borrando...`)

  let borrados = 0
  for (const p of productos) {
    try {
      await client.delete(p._id)
      borrados++
      if (borrados % 50 === 0) console.log(`  ⏳ ${borrados}/${productos.length} borrados...`)
    } catch (err) {
      console.error(`  ✗ Error borrando "${p.nombre}": ${err.message}`)
    }
  }

  console.log(`\n✅ ${borrados} productos borrados correctamente.`)
}

main().catch(console.error)
