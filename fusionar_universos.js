import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skZBwQsinABjggFzQF8R3evWjpIQOGRaFEINU7T8Fh8dpNEWVYepA9wogbz3DJGCkknWJe6e9k3CyVA746ikA0lnsSkwHFfbP3izzhJOQZnweiKVWFhuc1BIeQ7aiI1lRqAa75U4kZKd2WZTbzSHAsiNa46AdWbjnYldNe1KQYcUkn56FX5s',
  useCdn: false,
})

const FUSIONES = {
  'Batman 80 Years': 'Batman',
  'Batman Beyond': 'Batman',
  'Batman Ninja': 'Batman',
  'Batman the Animated Series': 'Batman',
  'The Batman': 'Batman',
  'The Batman Who Laughs': 'Batman',
  'Dark Multiverse': 'Batman',
  'Winnie The Pooh': 'Winnie the Pooh',
  'Jurassic World': 'Jurassic Park',
  'Deadpool & Wolverine': 'Deadpool',
  'Miles Morales': 'Spider-Man',
  'No Way Home': 'Spider-Man',
  'Super Heroes': 'Heroes',
}

async function main() {
  const universos = await client.fetch(`*[_type == "universo"]{ _id, nombre }`)
  console.log(`Total universos: ${universos.length}`)

  const mapaUniversos = {}
  universos.forEach(u => { mapaUniversos[u.nombre] = u._id })

  for (const [origen, destino] of Object.entries(FUSIONES)) {
    const idOrigen = mapaUniversos[origen]
    const idDestino = mapaUniversos[destino]

    if (!idOrigen) { console.log(`⚠️ No encontrado: ${origen}`); continue }
    if (!idDestino) { console.log(`⚠️ Destino no encontrado: ${destino}`); continue }
    if (idOrigen === idDestino) { console.log(`⏭️ Skip: ${origen}`); continue }

    const productos = await client.fetch(
      `*[_type == "producto" && universo._ref == $id]{ _id, nombre }`,
      { id: idOrigen }
    )

    console.log(`\n🔄 ${origen} → ${destino} (${productos.length} productos)`)

    for (const p of productos) {
      await client.patch(p._id)
        .set({ universo: { _type: 'reference', _ref: idDestino } })
        .commit()
      console.log(`  ✅ ${p.nombre}`)
    }

    await client.delete(idOrigen)
    console.log(`  🗑️ "${origen}" eliminado`)
  }

  console.log('\n✅ Fusión completada')
}

main().catch(console.error)