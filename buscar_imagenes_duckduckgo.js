// buscar_imagenes_duckduckgo.js
// Busca imágenes via DuckDuckGo (sin API key) y las sube a Sanity
// Uso: node buscar_imagenes_duckduckgo.js
// Prueba: node buscar_imagenes_duckduckgo.js --test
//
// Requiere: npm install @sanity/client axios cheerio

const { createClient } = require('@sanity/client')
const axios = require('axios')

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sken5HsIC8KHKHRGoZojawRjbEvqWWnbH8FOUUah254TOJlFxjiSCfefrxcjWYBEPR9Fk6Y3W7GSgRMSrLKDATFXTzz0mw02T46NVrDmE7hO63EFScnuE5U0VephTxOLf4IEbylEaQBmLjW5rN5b1CUtVqHo4OyRGDyeaqnQaLm6leCWD31e',
  useCdn: false,
})

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

// Obtiene token vqd de DuckDuckGo (requerido para image search)
async function getVqd(query) {
  try {
    const res = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
      headers: HEADERS,
      timeout: 10000,
    })
    const match = res.data.match(/vqd=['"]([^'"]+)['"]/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// Busca imágenes en DuckDuckGo
async function buscarImagenDDG(nombre) {
  try {
    const query = `${nombre} funko pop`
    const vqd = await getVqd(query)
    if (!vqd) return null

    const url = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1&v7exp=a`
    const res = await axios.get(url, {
      headers: { ...HEADERS, 'Referer': 'https://duckduckgo.com/' },
      timeout: 10000,
    })

    const results = res.data?.results
    if (!results || results.length === 0) return null

    // Filtrar imágenes de buena calidad (preferir las cuadradas o de tiendas conocidas)
    const buenas = results.filter(r =>
      r.image &&
      r.width >= 300 &&
      r.height >= 300 &&
      !r.image.includes('placeholder')
    )

    return buenas.length > 0 ? buenas[0].image : results[0].image
  } catch {
    return null
  }
}

// Sube imagen a Sanity desde URL
async function subirImagenASanity(imageUrl, nombreProducto) {
  try {
    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': HEADERS['User-Agent'] },
    })
    const buffer = Buffer.from(res.data)
    const contentType = res.headers['content-type'] || 'image/jpeg'
    if (!contentType.startsWith('image/')) return null

    const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
    const asset = await client.assets.upload('image', buffer, {
      filename: `${nombreProducto.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`,
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

  const productos = await client.fetch(
    `*[_type == "producto" && !defined(imagenes) && importadoDesdeExcel == true][0...${limite}]{ _id, nombre }`
  )

  console.log(`📦 ${productos.length} productos sin imagen${isTest ? ' (modo prueba)' : ''}...\n`)

  let exitosos = 0
  let fallidos = 0

  for (let i = 0; i < productos.length; i++) {
    const p = productos[i]
    console.log(`[${i + 1}/${productos.length}] ${p.nombre}`)

    const imgUrl = await buscarImagenDDG(p.nombre)

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
        asset: { _type: 'reference', _ref: assetId },
      }],
    }).commit()

    console.log(`  ✅ Imagen asignada\n`)
    exitosos++

    // Pausa para no ser bloqueado por DuckDuckGo
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`\n✅ Completado: ${exitosos} exitosos, ${fallidos} fallidos`)
}

main().catch(console.error)
