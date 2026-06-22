// buscar_imagenes_google.js
// Busca imágenes de productos via Google Custom Search y las sube a Sanity
// Uso: node buscar_imagenes_google.js
// Para probar primero: node buscar_imagenes_google.js --test

const { createClient } = require('@sanity/client')
const axios = require('axios')

const GOOGLE_API_KEY = 'AIzaSyAkJyHwBDNfBqhbnhJqRC3UqbAx7dJaLHA'
const SEARCH_ENGINE_ID = 'e5e18ebc4aee847e6'

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sken5HsIC8KHKHRGoZojawRjbEvqWWnbH8FOUUah254TOJlFxjiSCfefrxcjWYBEPR9Fk6Y3W7GSgRMSrLKDATFXTzz0mw02T46NVrDmE7hO63EFScnuE5U0VephTxOLf4IEbylEaQBmLjW5rN5b1CUtVqHo4OyRGDyeaqnQaLm6leCWD31e',
  useCdn: false,
})

async function buscarImagenGoogle(nombre) {
  try {
    const query = `${nombre} funko pop`
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&num=1&imgSize=medium&imgType=photo`
    
    const res = await axios.get(url, { timeout: 10000 })
    
    if (res.data.items && res.data.items.length > 0) {
      return res.data.items[0].link
    }
    return null
  } catch (err) {
    if (err.response?.status === 429) {
      console.log('  ⚠️  Límite de API alcanzado, esperando...')
      await new Promise(r => setTimeout(r, 5000))
    }
    return null
  }
}

async function subirImagenASanity(imageUrl, nombreProducto) {
  try {
    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const buffer = Buffer.from(res.data)
    const contentType = res.headers['content-type'] || 'image/jpeg'
    
    // Solo subir si es imagen válida
    if (!contentType.startsWith('image/')) return null
    
    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const asset = await client.assets.upload('image', buffer, {
      filename: `${nombreProducto.replace(/[^a-z0-9]/gi, '_')}.${ext}`,
      contentType,
    })
    return asset._id
  } catch {
    return null
  }
}

async function main() {
  const isTest = process.argv.includes('--test')
  const limite = isTest ? 5 : 99999

  // Obtener productos sin imagen
  const productos = await client.fetch(
    `*[_type == "producto" && !defined(imagenes) && importadoDesdeExcel == true][0...${limite}]{ _id, nombre }`
  )

  console.log(`📦 ${productos.length} productos sin imagen${isTest ? ' (modo prueba)' : ''}...\n`)

  let exitosos = 0
  let fallidos = 0

  for (let i = 0; i < productos.length; i++) {
    const p = productos[i]
    console.log(`[${i + 1}/${productos.length}] ${p.nombre}`)

    const imgUrl = await buscarImagenGoogle(p.nombre)

    if (!imgUrl) {
      console.log(`  ✗ No encontrada\n`)
      fallidos++
      continue
    }

    const assetId = await subirImagenASanity(imgUrl, p.nombre)

    if (!assetId) {
      console.log(`  ✗ Error al subir\n`)
      fallidos++
      continue
    }

    await client.patch(p._id).set({
      imagenes: [{
        _type: 'image',
        _key: assetId,
        asset: { _type: 'reference', _ref: assetId }
      }]
    }).commit()

    console.log(`  ✅ Imagen asignada\n`)
    exitosos++

    // Pausa para no exceder límite de Google (100 req/día gratis, luego $5/1000)
    await new Promise(r => setTimeout(r, 1200))
  }

  console.log(`\n✅ Completado: ${exitosos} exitosos, ${fallidos} fallidos`)
  if (!isTest) console.log(`💰 Costo aproximado: $${(productos.length / 1000 * 5).toFixed(2)} USD`)
}

main().catch(console.error)
