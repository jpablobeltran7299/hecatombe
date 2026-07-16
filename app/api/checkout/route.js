import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

export async function POST(request) {
  try {
    const { items, userId, userEmail } = await request.json()

    const preference = new Preference(client)

    const response = await preference.create({
      body: {
        items: items.map(item => ({
          id: item.productoId,
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: item.precio,
          currency_id: 'MXN',
          picture_url: item.imagen || '',
        })),
        payer: {
          email: userEmail,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=exitoso`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=fallido`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=pendiente`,
        },
        auto_return: 'approved',
        external_reference: userId,
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`,
      }
    })

    return NextResponse.json({ id: response.id, init_point: response.init_point })
  } catch (error) {
    console.error('Error MP:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}