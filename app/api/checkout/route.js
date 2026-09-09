import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getProducto, getProductosPorIds, calcularPrecioFinal } from '@/lib/sanity'
import { getSanityWriteClient, descontarStock } from '@/lib/sanityAdmin'
import { ajustarHecacoins } from '@/lib/hecacoins'

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

    // Si paga todo con Hecacoins — no pasa por MercadoPago, así que hay que
    // generar el pedido, descontar stock y mandar los correos aquí mismo
    // (antes esto no hacía nada de eso: la compra "se completaba" pero no
    // quedaba ningún registro ni aviso).
    if (totalFinal === 0) {
      try {
        await ajustarHecacoins(supabase, userId, {
          saldoDelta: -descuentoHecacoins,
          canjeadoDelta: descuentoHecacoins,
          exigirSaldoSuficiente: true,
        })
      } catch (e) {
        if (e.message === 'SALDO_INSUFICIENTE') {
          return NextResponse.json({ error: 'Saldo de Hecacoins insuficiente.' }, { status: 400 })
        }
        throw e
      }

      const itemsPedido = itemsValidados.map(i => ({ producto_id: i.productoId, cantidad: i.cantidad }))

      const { data: pedido } = await supabase.from('pedidos').insert({
        user_id: userId,
        total: totalOriginal,
        estado: tipo_pedido === 'apartado' ? 'apartado' : 'pagado',
        items: itemsPedido,
        mp_payment_id: null,
        tipo_pedido: tipo_pedido || 'normal',
        destino: destino || 'directo',
        bodega_estado: destino === 'bodega' ? 'guardando' : null,
        producto_id: producto_id || null,
        anticipo_pagado: anticipo_pagado || null,
        monto_liquidacion: tipo_pedido === 'liquidacion' ? montoLiquidacionReal : (monto_liquidacion || null),
      }).select().single()

      await supabase.from('hecacoins_movimientos').insert({
        user_id: userId,
        pedido_id: pedido?.id,
        tipo: 'canjeado',
        monto: descuentoHecacoins,
        descripcion: `Canje en pedido #${pedido?.id}`,
      })

      if (tipo_pedido === 'liquidacion' && pedido_id) {
        await supabase.from('pedidos').update({ estado: 'liquidado' }).eq('id', pedido_id)
      }

      if (tipo_pedido === 'normal') {
        await supabase.from('carrito').delete().eq('user_id', userId)

        const sanityClient = getSanityWriteClient()
        for (const item of itemsPedido) {
          await descontarStock(sanityClient, item.producto_id, item.cantidad || 1)
        }
      } else if (tipo_pedido === 'liquidacion' && producto_id) {
        const sanityClient = getSanityWriteClient()
        await descontarStock(sanityClient, producto_id, 1)
      }

      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        const esApartado = tipo_pedido === 'apartado'
        await resend.emails.send({
          from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
          to: userEmail,
          subject: esApartado ? '🔒 ¡Producto apartado! — Hecatombe Coleccionables' : '✅ ¡Tu pedido está confirmado! — Hecatombe Coleccionables',
          html: `<p>Hola, tu pedido #${pedido?.id} fue pagado por completo con ${descuentoHecacoins.toLocaleString('es-MX')} Hecacoins. ${esApartado ? 'Te avisaremos cuando llegue para que puedas liquidar el resto.' : 'En breve nos pondremos en contacto contigo para coordinar el envío.'}</p>`,
        })
        await resend.emails.send({
          from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
          to: 'hecatombe.9194@gmail.com',
          subject: `🪙 Pedido #${pedido?.id} pagado 100% con Hecacoins — $${totalOriginal.toLocaleString('es-MX')} MXN`,
          html: `<p>Cliente: ${userEmail}<br>Pedido #${pedido?.id}<br>Valor: $${totalOriginal.toLocaleString('es-MX')} MXN<br>Hecacoins usadas: ${descuentoHecacoins.toLocaleString('es-MX')}</p>`,
        })
      } catch (e) {
        console.error('Error enviando correos de pago con Hecacoins:', e)
      }

      return NextResponse.json({
        pago_completo_hecacoins: true,
        descuento: descuentoHecacoins,
        total_final: 0,
        pedido_id: pedido?.id,
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
          pedido_id: tipo_pedido === 'liquidacion' ? pedido_id : null,
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