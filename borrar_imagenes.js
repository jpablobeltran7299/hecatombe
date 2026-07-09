import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'bo1h439d',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: 'skEzjvgKllXZp7dfa5zX3QTfamu7d7Z2numxOJoJFyCHFvDbBH3CL6SBe8wlghjRIQYYzGQSMIGuLjOPJiskSnGcDjxPwge4VXnxirIB5H7WY9FrogPyJRa8sCxNKgbyZ31Cg6awITmxB9fhabfcp3yBFLIwrdFmswmz9S9Bfidc8fYmfgUN',
  useCdn: false,
})

async function main() {
  const productos = await client.fetch(
    `*[_type == "producto" && defined(imagenes) && count(imagenes) > 0]{ _id, nombre }`
  )

  console.log(`Borrando imágenes de ${productos.length} productos...`)

  for (const p of productos) {
    await client.patch(p._id).unset(['imagenes']).commit()
    console.log(`🗑️ ${p.nombre}`)
  }

  console.log('✅ Listo')
}

main()