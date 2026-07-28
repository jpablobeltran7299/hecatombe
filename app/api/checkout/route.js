import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  })

  try {
    const { items, userId, userEmail, direccion, tipo_pedido, producto_id, anticipo_pagado, monto_liquidacion } = await request.json()

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
        external_reference: JSON.stringify({
          userId,
          tipo_pedido: tipo_pedido || 'normal',
          producto_id: producto_id || null,
          anticipo_pagado: anticipo_pagado || null,
          monto_liquidacion: monto_liquidacion || null,
        }),
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`,
      }
    })

    return NextResponse.json({ id: response.id, init_point: response.init_point })
  } catch (error) {
    console.error('Error MP:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}