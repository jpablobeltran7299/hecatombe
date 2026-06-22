// buscar_imagenes_test2.js
// Prueba con fuente alternativa: hollywoodcollectibles / stashpedia / direct funko CDN
// Uso: node buscar_imagenes_test2.js

const { createClient } = require('@sanity/client')
const axios = require('axios')
const cheerio = require('cheerio')

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'sken5HsIC8KHKHRGoZojawRjbEvqWWnbH8FOUUah254TOJlFxjiSCfefrxcjWYBEPR9Fk6Y3W7GSgRMSrLKDATFXTzz0mw02T46NVrDmE7hO63EFScnuE5U0VephTxOLf4IEbylEaQBmLjW5rN5b1CUtVqHo4OyRGDyeaqnQaLm6leCWD31e',
  useCdn: false,
})

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
}

// Extrae número de modelo del nombre (ej: "Ghost Face #1138" -> "1138")
function extraerNumero(nombre) {
  const match = nombre.match(/#(\d+)/)
  return match ? match[1] : null
}

// Fuente 1: Stashpedia
async function buscarEnStashpedia(nombre) {
  try {
    const query = encodeURIComponent(nombre)
    const url = `https://stashpedia.com/search?q=${query}`
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000 })
    const $ = cheerio.load(res.data)
    
    let imgUrl = null
    $('img[src*="cdn"], img[data-src*="cdn"]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src')
      if (src && (src.includes('.jpg') || src.includes('.png')) && !imgUrl) {
        imgUrl = src.startsWith('http') ? src : `https://stashpedia.com${src}`
      }
    })
    return imgUrl
  } catch { return null }
}

// Fuente 2: Funko Europe CDN directo por número
async function buscarEnFunkoCDN(nombre) {
  try {
    const numero = extraerNumero(nombre)
    if (!numero) return null
    
    // Funko usa este patrón de URL para sus imágenes
    const paddedNum = numero.padStart(5, '0')
    const url = `https://www.funko.com/cdn/shop/products/FU${paddedNum}_1.png`
    
    const res = await axios.head(url, { headers: HEADERS, timeout: 5000 })
    if (res.status === 200) return url
    return null
  } catch { return null }
}

// Fuente 3: Entertainment Earth
async function buscarEnEntertainmentEarth(nombre) {
  try {
    const query = encodeURIComponent(nombre + ' funko')
    const url = `https://www.entertainmentearth.com/search.do?query=${query}`
    const res = await axios.get(url, { headers: HEADERS, timeout: 8000 })
    const $ = cheerio.load(res.data)
    
    let imgUrl = null
    $('img.product-image, img[class*="product"]').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src')
      if (src && !imgUrl) {
        imgUrl = src.startsWith('http') ? src : `https://www.entertainmentearth.com${src}`
      }
    })
    return imgUrl
  } catch { return null }
}

async function subirImagenASanity(imageUrl, nombreProducto) {
  try {
    const res = await axios.get(imageUrl, { 
      responseType: 'arraybuffer', 
      timeout: 10000,
      headers: HEADERS
    })
    const buffer = Buffer.from(res.data)
    const asset = await client.assets.upload('image', buffer, {
      filename: `${nombreProducto.replace(/[^a-z0-9]/gi, '_')}.jpg`,
      contentType: res.headers['content-type'] || 'image/jpeg',
    })
    return asset._id
  } catch { return null }
}

async function main() {
  const productos = await client.fetch(
    `*[_type == "producto" && !defined(imagenes) && importadoDesdeExcel == true][0...5]{ _id, nombre }`
  )

  console.log(`🔍 Probando con ${productos.length} productos...\n`)

  for (const p of productos) {
    console.log(`📦 ${p.nombre}`)
    
    let imgUrl = null

    imgUrl = await buscarEnFunkoCDN(p.nombre)
    if (imgUrl) console.log(`  → Funko CDN: ${imgUrl}`)

    if (!imgUrl) {
      imgUrl = await buscarEnStashpedia(p.nombre)
      if (imgUrl) console.log(`  → Stashpedia: ${imgUrl}`)
    }

    if (!imgUrl) {
      imgUrl = await buscarEnEntertainmentEarth(p.nombre)
      if (imgUrl) console.log(`  → Entertainment Earth: ${imgUrl}`)
    }

    if (!imgUrl) {
      console.log(`  ✗ No se encontró imagen\n`)
      continue
    }

    const assetId = await subirImagenASanity(imgUrl, p.nombre)
    if (!assetId) {
      console.log(`  ✗ Error al subir imagen\n`)
      continue
    }

    await client.patch(p._id).set({
      imagenes: [{ _type: 'image', _key: assetId, asset: { _type: 'reference', _ref: assetId } }]
    }).commit()

    console.log(`  ✅ Imagen subida y asignada\n`)
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log('✅ Prueba completada')
}

main().catch(console.error)
