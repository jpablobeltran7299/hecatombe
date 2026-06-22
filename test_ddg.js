const axios = require('axios')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

async function test() {
  const query = 'funko pop spiderman'
  
  // Paso 1: obtener vqd
  console.log('Paso 1: obteniendo vqd...')
  const res = await axios.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`, {
    headers: HEADERS,
    timeout: 10000,
  })
  
  const match = res.data.match(/vqd=['"]([^'"]+)['"]/)
  console.log('vqd encontrado:', match ? match[1] : 'NO ENCONTRADO')
  console.log('Status:', res.status)
  
  // Muestra fragmento del HTML para ver qué está devolviendo
  const idx = res.data.indexOf('vqd')
  if (idx > -1) {
    console.log('Contexto vqd:', res.data.substring(idx - 20, idx + 60))
  } else {
    console.log('HTML muestra (primeros 500 chars):', res.data.substring(0, 500))
  }
}

test().catch(console.error)
