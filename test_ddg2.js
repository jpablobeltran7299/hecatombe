const axios = require('axios')

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://duckduckgo.com/',
}

async function test() {
  const query = 'funko pop spiderman'
  const vqd = '4-208212997273566044636661265706284387592'

  const urls = [
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1`,
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&p=1`,
  ]

  for (const url of urls) {
    console.log('\nProbando:', url.substring(0, 80))
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 10000 })
      console.log('Status:', res.status)
      if (res.data && res.data.results) {
        console.log('Resultados:', res.data.results.length)
        console.log('Primera imagen:', res.data.results[0] && res.data.results[0].image)
      } else {
        console.log('Data:', JSON.stringify(res.data).substring(0, 200))
      }
    } catch(e) {
      console.log('Error:', e.response && e.response.status, e.message)
    }
  }
}

test().catch(console.error)
