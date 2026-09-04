import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getProducto, getProductosPorIds, calcularPrecioFinal } from '@/lib/sanity'

// Rate limit en memoria: 10 solicitudes por IP cada 60s.
// Vive solo en la instancia serverless que lo procesa (no es un límite
// global distribuido) — mitiga abuso/spam básico sin depender de Redis.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const rateLimitMap = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT_MAX) return false
  entry.count++
  return true
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 })
  }

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
      tipo_pedido, producto_id, pedido_id, anticipo_pagado, monto_liquidacion,
      hecacoins_a_canjear, destino
    } = await request.json()

    // Validar precios reales contra Sanity — nunca confiar en el precio que manda el cliente.
    // Para 'liquidacion' el monto correcto no vive en Sanity (puede haber cambiado desde que
    // se apartó); vive en pedidos.monto_liquidacion en Supabase, atado al pedido_id exacto.
    let itemsValidados = items
    let montoLiquidacionReal = null

    if (tipo_pedido === 'apartado') {
      const item = items[0]
      const real = await getProducto(item.productoId)
      if (!real || real.activo === false) {
        return NextResponse.json({ error: `"${item.nombre}" ya no está disponible.` }, { status: 400 })
      }
      if (real.anticipo == null) {
        return NextResponse.json({ error: `"${item.nombre}" ya no está disponible para apartar.` }, { status: 400 })
      }
      itemsValidados = [{ ...item, precio: real.anticipo }]
    } else if (tipo_pedido === 'liquidacion') {
      if (!pedido_id) {
        return NextResponse.json({ error: 'Falta pedido_id para procesar la liquidación.' }, { status: 400 })
      }

      const { data: pedidoApartado } = await supabase
        .from('pedidos')
        .select('id, user_id, producto_id, estado, tipo_pedido, monto_liquidacion')
        .eq('id', pedido_id)
        .single()

      if (!pedidoApartado || pedidoApartado.user_id !== userId) {
        return NextResponse.json({ error: 'No se encontró una preventa apartada para este pedido.' }, { status: 400 })
      }
      if (pedidoApartado.estado !== 'apartado' || pedidoApartado.tipo_pedido !== 'apartado') {
        return NextResponse.json({ error: 'Esta preventa ya no está disponible para liquidar.' }, { status: 400 })
      }
      if (pedidoApartado.monto_liquidacion == null) {
        return NextResponse.json({ error: 'Este pedido no tiene un monto de liquidación definido. Contacta a soporte.' }, { status: 400 })
      }

      montoLiquidacionReal = pedidoApartado.monto_liquidacion
      itemsValidados = [{ ...items[0], precio: montoLiquidacionReal }]
    } else {
      const ids = items.map(i => i.productoId)
      const productosReales = await getProductosPorIds(ids)
      const productosMap = {}
      productosReales.forEach(p => { productosMap[p._id] = p })

      const faltante = items.find(i => !productosMap[i.productoId])
      if (faltante) {
        return NextResponse.json({ error: `"${faltante.nombre}" ya no está disponible.` }, { status: 400 })
      }

      itemsValidados = items.map(item => ({
        ...item,
        precio: calcularPrecioFinal(productosMap[item.productoId]).precioFinal,
      }))
    }

    // Calcular total original (con precios ya validados contra Sanity)
    const totalOriginal = itemsValidados.reduce((acc, i) => acc + (i.precio * i.cantidad), 0)

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
          ...itemsValidados.map(item => ({
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
      : itemsValidados.map(item => ({
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
          monto_liquidacion: tipo_pedido === 'liquidacion' ? montoLiquidacionReal : (monto_liquidacion || null),
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