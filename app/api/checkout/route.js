import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const {
      items, userId, userEmail, direccion,
      tipo_pedido, producto_id, anticipo_pagado, monto_liquidacion,
      hecacoins_a_canjear, destino
    } = await request.json()

    // Calcular total original
    const totalOriginal = items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)

    // Validar Hecacoins si se quieren canjear
    let descuentoHecacoins = 0
    if (hecacoins_a_canjear > 0) {
      const { data: saldo } = await supabase
        .from('hecacoins')
        .select('saldo')
        .eq('user_id', userId)
        .single()

      const saldoDisponible = saldo?.saldo || 0
      descuentoHecacoins = Math.min(hecacoins_a_canjear, saldoDisponible, totalOriginal)
    }

    const totalFinal = Math.max(0, totalOriginal - descuentoHecacoins)

    // Si paga todo con Hecacoins
    if (totalFinal === 0) {
      // Descontar Hecacoins directamente sin pasar por MP
      await supabase
        .from('hecacoins')
        .update({
          saldo: supabase.rpc('decrement', { x: descuentoHecacoins }),
          total_canjeado: supabase.rpc('increment', { x: descuentoHecacoins }),
        })
        .eq('user_id', userId)

      return NextResponse.json({
        pago_completo_hecacoins: true,
        descuento: descuentoHecacoins,
        total_final: 0
      })
    }

    const preference = new Preference(client)

    // Items ajustados con descuento si aplica
    const itemsMP = descuentoHecacoins > 0
      ? [
          ...items.map(item => ({
            id: item.productoId,
            title: item.nombre,
            quantity: item.cantidad,
            unit_price: item.precio,
            currency_id: 'MXN',
            picture_url: item.imagen || '',
          })),
          {
            id: 'hecacoins-descuento',
            title: `Descuento Hecacoins`,
            quantity: 1,
            unit_price: -descuentoHecacoins,
            currency_id: 'MXN',
          }
        ]
      : items.map(item => ({
          id: item.productoId,
          title: item.nombre,
          quantity: item.cantidad,
          unit_price: item.precio,
          currency_id: 'MXN',
          picture_url: item.imagen || '',
        }))

    const response = await preference.create({
      body: {
        items: itemsMP,
        payer: { email: userEmail },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=exitoso`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=fallido`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL}/carrito?estado=pendiente`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({
          userId,
          tipo_pedido: tipo_pedido || 'normal',
          destino: destino || 'directo',
          producto_id: producto_id || null,
          anticipo_pagado: anticipo_pagado || null,
          monto_liquidacion: monto_liquidacion || null,
          hecacoins_canjeadas: descuentoHecacoins,
        }),
        notification_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook`,
      }
    })

    return NextResponse.json({
      id: response.id,
      init_point: response.init_point,
      descuento_hecacoins: descuentoHecacoins,
      total_final: totalFinal
    })
  } catch (error) {
    console.error('Error MP:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}