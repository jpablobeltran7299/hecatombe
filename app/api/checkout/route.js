import { MercadoPagoConfig, Preference } from 'mercadopago'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getProducto, getProductosPorIds, calcularPrecioFinal } from '@/lib/sanity'
import { getSanityWriteClient, descontarStock } from '@/lib/sanityAdmin'
import { ajustarHecacoins } from '@/lib/hecacoins'
import { obtenerCotizacion } from '@/lib/soloenvios'
import { COSTO_ENVIO_MXN, BODEGA_THRESHOLD_MXN } from '@/lib/constants'

export const maxDuration = 60

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
      items, userId, userEmail, direccion_id,
      tipo_pedido, producto_id, pedido_id, anticipo_pagado, monto_liquidacion,
      hecacoins_a_canjear, destino, quotation_id, rate_id
    } = await request.json()

    // Se requiere una dirección guardada (y confirmada por el cliente) para
    // apartados, liquidaciones y compras normales, siempre que no vayan a
    // Bodegatombe (ahí no hace falta todavía).
    const requiereDireccion = tipo_pedido === 'apartado' || (destino !== 'bodega' && ['normal', 'liquidacion'].includes(tipo_pedido || 'normal'))
    let direccionSnapshot = null
    if (requiereDireccion) {
      if (!direccion_id) {
        return NextResponse.json({ error: 'Falta elegir una dirección de envío.' }, { status: 400 })
      }
      const { data: direccionReal } = await supabase
        .from('direcciones')
        .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
        .eq('id', direccion_id)
        .eq('user_id', userId)
        .single()
      if (!direccionReal) {
        return NextResponse.json({ error: 'La dirección seleccionada no es válida.' }, { status: 400 })
      }
      direccionSnapshot = direccionReal
    }

    // Validar precios reales contra Sanity — nunca confiar en el precio que manda el cliente.
    // Para 'liquidacion' el monto correcto no vive en Sanity (puede haber cambiado desde que
    // se apartó); vive en pedidos.monto_liquidacion en Supabase, atado al pedido_id exacto.
    let itemsValidados = items
    let montoLiquidacionReal = null
    let valorTotalOrdenLiquidacion = null

    if (tipo_pedido === 'apartado') {
      const item = items[0]
      const real = await getProducto(item.productoId)
      if (!real || real.activo === false) {
        return NextResponse.json({ error: `"${item.nombre}" ya no está disponible.` }, { status: 400 })
      }
      if (real.anticipo == null) {
        return NextResponse.json({ error: `"${item.nombre}" ya no está disponible para apartar.` }, { status: 400 })
      }
      // El stock de una preventa son las piezas que se consiguieron con el
      // proveedor — al agotarse, ya no se puede apartar más (el cliente debe
      // registrar su interés en vez de pagar por una pieza que no existe).
      if (real.stock !== null && real.stock !== undefined && real.stock <= 0) {
        return NextResponse.json({ error: `Ya no quedan piezas de "${item.nombre}" disponibles para apartar. Regístrate en la página del producto para que te avisemos si conseguimos más.` }, { status: 400 })
      }
      itemsValidados = [{ ...item, precio: real.anticipo }]
    } else if (tipo_pedido === 'liquidacion') {
      if (!pedido_id) {
        return NextResponse.json({ error: 'Falta pedido_id para procesar la liquidación.' }, { status: 400 })
      }

      const { data: pedidoApartado } = await supabase
        .from('pedidos')
        .select('id, user_id, producto_id, estado, tipo_pedido, monto_liquidacion, anticipo_pagado')
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
      // El valor completo de la pieza (anticipo + liquidación) es lo que
      // decide si aplica envío gratis — no el saldo restante, que puede ser
      // chico aunque la pieza completa valga mucho más de $1,200.
      valorTotalOrdenLiquidacion = (pedidoApartado.anticipo_pagado || 0) + montoLiquidacionReal
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

    // Costo de envío: se calcula aquí, nunca se confía en lo que mande el cliente.
    // Aplica en compras normales y en liquidaciones de preventa que eligen
    // envío directo (no bodega) y no alcanzan el monto de envío gratis.
    // Para liquidación, el umbral se compara contra el valor completo de la
    // pieza (anticipo + liquidación), no contra el saldo restante.
    const valorParaUmbralEnvio = tipo_pedido === 'liquidacion' ? valorTotalOrdenLiquidacion : totalOriginal
    const requiereEnvioPago = ['normal', 'liquidacion'].includes(tipo_pedido || 'normal') && destino !== 'bodega' && valorParaUmbralEnvio < BODEGA_THRESHOLD_MXN

    let costoEnvio = 0
    let envioCotizacion = null
    if (requiereEnvioPago) {
      if (quotation_id && rate_id) {
        // Se vuelve a leer la cotización real y se verifica que la tarifa
        // elegida siga ahí — nunca se confía en el monto que manda el cliente.
        const { tarifas } = await obtenerCotizacion(quotation_id)
        const tarifaElegida = tarifas.find(t => t.id === rate_id)
        if (!tarifaElegida) {
          return NextResponse.json({ error: 'La tarifa de envío elegida ya no es válida. Vuelve a cotizar.' }, { status: 400 })
        }
        costoEnvio = parseFloat(tarifaElegida.total)
        envioCotizacion = {
          quotation_id,
          rate_id,
          proveedor: tarifaElegida.provider_display_name,
          servicio: tarifaElegida.provider_service_name,
          total: costoEnvio,
          dias: tarifaElegida.days,
        }
      } else {
        // Fallback temporal: la liquidación de preventas aún no cotiza en
        // tiempo real (pendiente), así que sigue usando el monto fijo.
        costoEnvio = COSTO_ENVIO_MXN
      }
    }

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

    const totalFinal = Math.max(0, totalOriginal - descuentoHecacoins) + costoEnvio

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
        direccion_snapshot: direccionSnapshot,
        envio_cotizacion: envioCotizacion,
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
      } else if (tipo_pedido === 'apartado' && producto_id) {
        // El apartado es lo que reclama la pieza reservada del proveedor —
        // la liquidación (pago final) no vuelve a descontar, ya se contó aquí.
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

    // Items ajustados con descuento y envío si aplica
    const itemsMP = [
      ...itemsValidados.map(item => ({
        id: item.productoId,
        title: item.nombre,
        quantity: item.cantidad,
        unit_price: item.precio,
        currency_id: 'MXN',
        picture_url: item.imagen || '',
      })),
      ...(descuentoHecacoins > 0 ? [{
        id: 'hecacoins-descuento',
        title: `Descuento Hecacoins`,
        quantity: 1,
        unit_price: -descuentoHecacoins,
        currency_id: 'MXN',
      }] : []),
      ...(costoEnvio > 0 ? [{
        id: 'envio',
        title: 'Servicio de envío',
        quantity: 1,
        unit_price: costoEnvio,
        currency_id: 'MXN',
      }] : []),
    ]

    // Mercado Pago rechaza el pago en checkout (sin dar motivo) cuando
    // external_reference es muy largo — no está documentado un límite exacto,
    // pero se confirmó en producción que un JSON con todos estos campos
    // (~300 caracteres) rompe el pago mientras uno corto (~200) sí funciona.
    // Por eso el detalle completo se guarda en Supabase y a MP solo se le
    // manda el id de ese registro — el webhook lo vuelve a leer de ahí.
    const { data: checkoutPendiente, error: errorCheckoutPendiente } = await supabase
      .from('checkout_pendientes')
      .insert({
        payload: {
          userId,
          tipo_pedido: tipo_pedido || 'normal',
          destino: destino || 'directo',
          producto_id: producto_id || null,
          pedido_id: tipo_pedido === 'liquidacion' ? pedido_id : null,
          anticipo_pagado: anticipo_pagado || null,
          monto_liquidacion: tipo_pedido === 'liquidacion' ? montoLiquidacionReal : (monto_liquidacion || null),
          hecacoins_canjeadas: descuentoHecacoins,
          costo_envio: costoEnvio,
          direccion_id: direccion_id || null,
          quotation_id: envioCotizacion?.quotation_id || null,
          rate_id: envioCotizacion?.rate_id || null,
        }
      })
      .select('id')
      .single()

    if (errorCheckoutPendiente) {
      throw new Error(`Error al guardar el checkout pendiente: ${errorCheckoutPendiente.message}`)
    }

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
        external_reference: String(checkoutPendiente.id),
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