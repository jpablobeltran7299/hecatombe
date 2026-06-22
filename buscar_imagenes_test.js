// buscar_imagenes_test.js
// Prueba con 5 productos — busca imágenes en PopPriceGuide y las sube a Sanity
// Uso: node buscar_imagenes_test.js

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

async function buscarImagenFunko(nombre) {
  try {
    const query = encodeURIComponent(nombre + ' funko pop')
    const url = `https://www.popcultureguide.com/search/?q=${query}`
    
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    })

    const $ = cheerio.load(res.data)
    
    // Buscar primera imagen de producto
    let imgUrl = null
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src')
      if (src && src.includes('funko') && !imgUrl) {
        imgUrl = src.startsWith('http') ? src : `https://www.popcultureguide.com${src}`
      }
    })

    return imgUrl
  } catch (err) {
    return null
  }
}

async function subirImagenASanity(imageUrl, nombreProducto) {
  try {
    const res = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 })
    const buffer = Buffer.from(res.data)
    
    const asset = await client.assets.upload('image', buffer, {
      filename: `${nombreProducto.replace(/[^a-z0-9]/gi, '_')}.jpg`,
      contentType: 'image/jpeg',
    })
    
    return asset._id
  } catch (err) {
    return null
  }
}

async function main() {
  // Obtener 5 productos sin imagen
  const productos = await client.fetch(
    `*[_type == "producto" && !defined(imagenes) && importadoDesdeExcel == true][0...5]{ _id, nombre }`
  )

  console.log(`🔍 Probando con ${productos.length} productos...\n`)

  for (const p of productos) {
    console.log(`📦 ${p.nombre}`)
    
    const imgUrl = await buscarImagenFunko(p.nombre)
    
    if (!imgUrl) {
      console.log(`  ✗ No se encontró imagen\n`)
      continue
    }
    
    console.log(`  ✓ Imagen encontrada: ${imgUrl}`)
    
    const assetId = await subirImagenASanity(imgUrl, p.nombre)
    
    if (!assetId) {
      console.log(`  ✗ Error al subir imagen\n`)
      continue
    }

    await client.patch(p._id).set({
      imagenes: [{ _type: 'image', _key: assetId, asset: { _type: 'reference', _ref: assetId } }]
    }).commit()

    console.log(`  ✅ Imagen subida y asignada\n`)
    
    // Pausa para no saturar el servidor
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log('✅ Prueba completada')
}

main().catch(console.error)
