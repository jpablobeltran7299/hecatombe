import { descontarStock } from '@/lib/sanityAdmin'
import { ajustarHecacoins } from '@/lib/hecacoins'
import { obtenerCotizacion } from '@/lib/soloenvios'
import { alertarAdmin } from '@/lib/alertas'
import { plantillaConfirmacionCliente, tablaProductosHtml, BCC_MONITOREO_CLIENTES } from '@/lib/emailTemplates'

// Procesa un pago de MercadoPago ya confirmado como `approved` — crea el
// pedido, descuenta stock, ajusta Hecacoins y manda los correos de
// confirmación. La llaman tanto el webhook real como las redes de seguridad
// (verificación al volver del pago, cron de reconciliación), así que nunca
// debe lanzar por casos de negocio esperados — siempre devuelve un resultado
// tipado para que el caller (incluido un loop del cron) pueda seguir.
export async function procesarPagoAprobado(pago, { supabase, sanityClient, resend }) {
  try {
    const paymentId = pago.id

    let userId, tipo_pedido, destino, producto_id, pedido_id_apartado, anticipo_pagado, monto_liquidacion, hecacoins_canjeadas, descuento_escalonado, promo_escalonada_nombre, costo_envio, direccion_id, quotation_id, rate_id, pedido_ids_bodega, envio_proveedor, envio_servicio, envio_dias
    let ref = null
    if (/^\d+$/.test(String(pago.external_reference || ''))) {
      const { data: checkoutPendiente } = await supabase
        .from('checkout_pendientes')
        .select('payload')
        .eq('id', pago.external_reference)
        .single()
      ref = checkoutPendiente?.payload || null
    }
    try {
      if (!ref) ref = JSON.parse(pago.external_reference)
      userId = ref.userId
      tipo_pedido = ref.tipo_pedido || 'normal'
      destino = ref.destino || 'directo'
      producto_id = ref.producto_id
      pedido_id_apartado = ref.pedido_id || null
      anticipo_pagado = ref.anticipo_pagado
      monto_liquidacion = ref.monto_liquidacion
      hecacoins_canjeadas = ref.hecacoins_canjeadas || 0
      descuento_escalonado = ref.descuento_escalonado || 0
      promo_escalonada_nombre = ref.promo_escalonada_nombre || null
      costo_envio = ref.costo_envio || 0
      direccion_id = ref.direccion_id || null
      quotation_id = ref.quotation_id || null
      rate_id = ref.rate_id || null
      pedido_ids_bodega = ref.pedido_ids || null
      envio_proveedor = ref.proveedor || null
      envio_servicio = ref.servicio || null
      envio_dias = ref.dias ?? null
    } catch {
      userId = pago.external_reference
      tipo_pedido = 'normal'
      destino = 'directo'
      descuento_escalonado = 0
      promo_escalonada_nombre = null
      costo_envio = 0
      direccion_id = null
      quotation_id = null
      rate_id = null
      pedido_ids_bodega = null
      envio_proveedor = null
      envio_servicio = null
      envio_dias = null
    }

    if (!userId) {
      return { status: 'no_encontrado', pedidoId: null, mensaje: 'No se pudo resolver external_reference' }
    }

    // Envío anticipado de Bodegatombe: no es un pedido nuevo, es el pago de
    // envío de varios pedidos ya existentes que siguen guardados.
    if (tipo_pedido === 'envio_bodega') {
      const { data: yaProcesado } = await supabase
        .from('pedidos')
        .select('id')
        .eq('bodega_envio_mp_payment_id', String(paymentId))
        .limit(1)

      if (yaProcesado && yaProcesado.length > 0) {
        return { status: 'ya_procesado', pedidoId: yaProcesado[0].id, mensaje: 'Envío de bodega ya procesado' }
      }

      const { data: direccionElegida } = await supabase
        .from('direcciones')
        .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
        .eq('id', direccion_id)
        .single()

      const { data: pedidosActualizados } = await supabase.from('pedidos')
        .update({
          bodega_estado: 'solicitado',
          bodega_tipo_solicitud: 'pagado',
          bodega_envio_mp_payment_id: String(paymentId),
          direccion_snapshot: direccionElegida || null,
          envio_cotizacion: { quotation_id, rate_id, total: costo_envio, proveedor: envio_proveedor, servicio: envio_servicio, dias: envio_dias },
        })
        .in('id', pedido_ids_bodega || [])
        .eq('user_id', userId)
        .eq('destino', 'bodega')
        .eq('bodega_estado', 'guardando')
        .select('id')

      if (!pedidosActualizados || pedidosActualizados.length === 0) {
        return { status: 'ya_procesado', pedidoId: null, mensaje: 'Ningún pedido de bodega en estado "guardando" para actualizar' }
      }

      try {
        await resend.emails.send({
          from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
          to: 'hecatombe.9194@gmail.com',
          subject: `📦 Envío de Bodegatombe pagado — $${costo_envio.toLocaleString('es-MX')} MXN`,
          html: `<p>Cliente pagó por adelantar su envío de Bodegatombe.<br>Pedidos: ${(pedido_ids_bodega || []).join(', ')}<br>Envío pagado: $${costo_envio.toLocaleString('es-MX')} MXN<br><br>Entra a /admin/bodega para generar la guía con la tarifa ya elegida.</p>`,
        })
      } catch (e) {
        console.error('Error enviando aviso de envío de bodega pagado:', e)
      }

      return { status: 'creado', pedidoId: null, mensaje: 'Envío de bodega procesado' }
    }

    // Si es liquidación, verificar que el apartado original siga pendiente —
    // evita cobrar/procesar dos veces la misma liquidación.
    if (tipo_pedido === 'liquidacion' && pedido_id_apartado) {
      const { data: pedidoApartado } = await supabase
        .from('pedidos')
        .select('id, estado')
        .eq('id', pedido_id_apartado)
        .single()

      if (!pedidoApartado || pedidoApartado.estado !== 'apartado') {
        console.warn(`Liquidación ${paymentId} ignorada: pedido #${pedido_id_apartado} ya no está en estado "apartado" (posible doble pago)`)
        await alertarAdmin(
          `⚠️ Posible doble liquidación — pedido #${pedido_id_apartado}`,
          `Payment ID: ${paymentId}\nMonto: $${pago.transaction_amount}\nEl pedido #${pedido_id_apartado} ya no estaba en estado "apartado" cuando llegó esta liquidación. Revisar manualmente si hay que reembolsar.`
        )
        return { status: 'ya_procesado', pedidoId: pedido_id_apartado, mensaje: 'Liquidación ignorada — apartado ya no estaba pendiente' }
      }
    }

    const { data: { user } } = await supabase.auth.admin.getUserById(userId)
    const userEmail = user?.email || ''

    const { data: carritoItems } = await supabase
      .from('carrito')
      .select('producto_id, cantidad')
      .eq('user_id', userId)

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, apellido, telefono')
      .eq('user_id', userId)
      .single()

    const { data: direccionElegida } = direccion_id
      ? await supabase
          .from('direcciones')
          .select('nombre, apellido, telefono, calle, colonia, ciudad, estado, cp, referencias')
          .eq('id', direccion_id)
          .single()
      : { data: null }

    let envioCotizacion = null
    if (quotation_id && rate_id) {
      try {
        const { tarifas } = await obtenerCotizacion(quotation_id)
        const tarifaElegida = tarifas.find(t => t.id === rate_id)
        if (tarifaElegida) {
          envioCotizacion = {
            quotation_id,
            rate_id,
            proveedor: tarifaElegida.provider_display_name,
            servicio: tarifaElegida.provider_service_name,
            total: parseFloat(tarifaElegida.total),
            dias: tarifaElegida.days,
          }
        }
      } catch (e) {
        console.error('No se pudo releer la cotización de envío:', e)
      }
    }

    const nombreCliente = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : userEmail
    const direccion = direccionElegida
      ? `${direccionElegida.calle}, ${direccionElegida.colonia}, ${direccionElegida.ciudad}, ${direccionElegida.estado} CP ${direccionElegida.cp}${direccionElegida.referencias ? ` — ${direccionElegida.referencias}` : ''}`
      : 'No proporcionada'

    const itemsConSnapshot = (pago.additional_info?.items || [])
      .filter(i => i.id !== 'envio' && i.id !== 'hecacoins-descuento' && i.id !== 'promo-escalonada-descuento')
      .map(i => ({
        producto_id: i.id,
        cantidad: Number(i.quantity) || 1,
        nombre: i.title,
        precio: parseFloat(i.unit_price) || null,
        imagen: i.picture_url || null,
      }))

    const itemsPedido = itemsConSnapshot.length > 0
      ? itemsConSnapshot
      : tipo_pedido === 'normal'
        ? (carritoItems || [])
        : (producto_id ? [{ producto_id, cantidad: 1 }] : [])

    const { data: pedido, error: errorPedido } = await supabase.from('pedidos').insert({
      user_id: userId,
      total: pago.transaction_amount,
      estado: tipo_pedido === 'apartado' ? 'apartado' : 'pagado',
      items: itemsPedido,
      mp_payment_id: String(paymentId),
      tipo_pedido: tipo_pedido || 'normal',
      destino: destino || 'directo',
      bodega_estado: destino === 'bodega' ? 'guardando' : null,
      producto_id: producto_id || null,
      anticipo_pagado: anticipo_pagado || null,
      monto_liquidacion: monto_liquidacion || null,
      direccion_snapshot: direccionElegida || null,
      envio_cotizacion: envioCotizacion,
    }).select().single()

    if (errorPedido) {
      if (errorPedido.code === '23505') {
        console.log(`Pedido para payment ${paymentId} ya existía (carrera evitada por índice único)`)
        const { data: existente } = await supabase
          .from('pedidos')
          .select('id')
          .eq('mp_payment_id', String(paymentId))
          .single()
        return { status: 'ya_procesado', pedidoId: existente?.id ?? null, mensaje: 'Pedido ya existía (índice único)' }
      }
      throw new Error(`Error al guardar el pedido: ${errorPedido.message}`)
    }

    // A partir de aquí el pedido YA está creado y pagado — si algo de lo que
    // sigue falla, debe seguir intentando lo demás (y avisar qué quedó
    // pendiente) en vez de dejar el pedido a medias sin registro de qué faltó.

    if (tipo_pedido === 'liquidacion' && pedido_id_apartado) {
      const { data: cerrado } = await supabase
        .from('pedidos')
        .update({ estado: 'liquidado' })
        .eq('id', pedido_id_apartado)
        .eq('estado', 'apartado')
        .select('id')

      if (!cerrado || cerrado.length === 0) {
        await alertarAdmin(
          `🚨 Doble liquidación detectada — pedido #${pedido_id_apartado}`,
          `Payment ID: ${paymentId}\nPedido nuevo creado: #${pedido?.id}\nMonto: $${pago.transaction_amount}\n\nEste pago liquidó el pedido #${pedido_id_apartado}, pero otra liquidación ya lo había cerrado antes (carrera entre dos pagos casi simultáneos). Es probable que el cliente haya pagado dos veces — revisar manualmente si hay que reembolsar este pago.`
        )
      }
    }

    if (tipo_pedido === 'normal') {
      await supabase.from('carrito').delete().eq('user_id', userId)
    }

    // Descontar stock en Sanity
    try {
      if (tipo_pedido === 'normal') {
        const itemsVendidos = carritoItems || []
        for (const item of itemsVendidos) {
          await descontarStock(sanityClient, item.producto_id, item.cantidad || 1)
        }
      } else if (tipo_pedido === 'apartado' && producto_id) {
        await descontarStock(sanityClient, producto_id, 1)
      }
    } catch (e) {
      console.error(`Error descontando stock para pedido #${pedido?.id}:`, e)
      await alertarAdmin(
        `⚠️ No se descontó stock — pedido #${pedido?.id}`,
        `Payment ID: ${paymentId}\nPedido: #${pedido?.id}\nError: ${e.message}\n\nRevisar y descontar stock manualmente en Sanity si corresponde.`
      )
    }

    // Ajustar Hecacoins
    try {
      if (hecacoins_canjeadas > 0) {
        const { data: saldoActual } = await supabase
          .from('hecacoins')
          .select('saldo')
          .eq('user_id', userId)
          .single()
        if ((saldoActual?.saldo || 0) < hecacoins_canjeadas) {
          await alertarAdmin(
            `⚠️ Canje de Hecacoins sin saldo suficiente — pedido #${pedido?.id}`,
            `Usuario: ${userId}\nPedido #${pedido?.id}\nSe canjearon ${hecacoins_canjeadas} Hecacoins pero el saldo real era ${saldoActual?.saldo || 0}.\n\nEl cliente recibió un descuento que su saldo no respaldaba — probablemente gastó el saldo en otra compra entre el checkout y la confirmación del pago. No requiere acción urgente, pero vale la pena revisar el caso.`
          )
        }

        await ajustarHecacoins(supabase, userId, {
          saldoDelta: -hecacoins_canjeadas,
          canjeadoDelta: hecacoins_canjeadas,
        })

        await supabase.from('hecacoins_movimientos').insert({
          user_id: userId,
          pedido_id: pedido?.id,
          tipo: 'canjeado',
          monto: hecacoins_canjeadas,
          descripcion: `Canje en pedido #${pedido?.id}`,
        })
      }

      const tiposConHecacoins = ['normal', 'liquidacion']
      if (tiposConHecacoins.includes(tipo_pedido)) {
        const hecacoinsGanadas = Math.floor((pago.transaction_amount - costo_envio) * 0.03)

        if (hecacoinsGanadas > 0) {
          const añoActual = new Date().getFullYear()
          const vencimiento = `${añoActual}-12-31`

          await ajustarHecacoins(supabase, userId, {
            saldoDelta: hecacoinsGanadas,
            ganadoDelta: hecacoinsGanadas,
            vencimiento,
          })

          await supabase.from('hecacoins_movimientos').insert({
            user_id: userId,
            pedido_id: pedido?.id,
            tipo: 'ganado',
            monto: hecacoinsGanadas,
            descripcion: `Compra pedido #${pedido?.id}`,
          })
        }
      }
    } catch (e) {
      console.error(`Error ajustando Hecacoins para pedido #${pedido?.id}:`, e)
      await alertarAdmin(
        `⚠️ No se generaron/descontaron Hecacoins — pedido #${pedido?.id}`,
        `Payment ID: ${paymentId}\nUsuario: ${userId}\nPedido: #${pedido?.id}\nMonto: $${pago.transaction_amount}\nCosto envío: $${costo_envio}\nHecacoins a canjear: ${hecacoins_canjeadas}\nError: ${e.message}\n\nRevisar y ajustar Hecacoins manualmente si corresponde.`
      )
    }

    // Emails
    const esApartado = tipo_pedido === 'apartado'
    const esBodega = destino === 'bodega'

    try {
      const itemsParaCorreo = itemsConSnapshot.map(i => ({
        title: i.nombre,
        quantity: i.cantidad,
        unitPrice: i.precio,
        pictureUrl: i.imagen,
      }))
      const subtotalCorreo = itemsParaCorreo.reduce((acc, i) => acc + (i.unitPrice || 0) * i.quantity, 0)

      const { asunto: asuntoCliente, html: htmlCliente } = plantillaConfirmacionCliente({
        nombreCliente,
        pedidoId: pedido?.id || paymentId,
        monto: pago.transaction_amount,
        esApartado,
        esBodega,
        montoLiquidacion: monto_liquidacion,
        costoEnvio: costo_envio,
        proveedorEnvio: envioCotizacion?.proveedor,
        direccion,
        items: itemsParaCorreo,
        subtotal: itemsParaCorreo.length > 0 ? subtotalCorreo : null,
        descuentoHecacoins: hecacoins_canjeadas,
        descuentoPromocion: descuento_escalonado,
        nombrePromocion: promo_escalonada_nombre,
      })
      await resend.emails.send({
        from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
        to: userEmail,
        bcc: BCC_MONITOREO_CLIENTES,
        subject: asuntoCliente,
        html: htmlCliente,
      })

      await resend.emails.send({
        from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
        to: ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com'],
        subject: esApartado
          ? `🔒 Producto apartado #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN anticipo`
          : esBodega
          ? `📦 Nuevo pedido en bodega #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN`
          : `🛍️ Nuevo pedido #${pedido?.id} — $${pago.transaction_amount?.toLocaleString('es-MX')} MXN`,
        html: `
          <!DOCTYPE html>
          <html>
          <body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:40px 20px;">
              <tr><td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;max-width:600px;width:100%;">
                  <tr>
                    <td style="background:#f97316;padding:24px 40px;">
                      <h1 style="margin:0;color:#000;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">
                        ${esApartado ? '🔒 PRODUCTO APARTADO' : esBodega ? '📦 PEDIDO EN BODEGA' : '🛍️ NUEVO PEDIDO'}
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="color:#fff;font-size:24px;font-weight:900;text-transform:uppercase;margin:0 0 24px;">Pedido #${pedido?.id}</h2>
                      <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;margin-bottom:24px;" cellpadding="0" cellspacing="0">
                        <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Cliente</td></tr>
                        <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Nombre: <span style="color:#fff;">${nombreCliente}</span></td></tr>
                        <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Email: <span style="color:#fff;">${userEmail}</span></td></tr>
                        <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Teléfono: <span style="color:#fff;">${perfil?.telefono || 'No proporcionado'}</span></td></tr>
                        <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Modalidad de envío: <span style="color:${esBodega ? '#60a5fa' : '#4ade80'};font-weight:900;">${esBodega ? '📦 Guardar en Bodegatombe' : '🚚 Envío inmediato'}</span></td></tr>
                        ${!esBodega ? `<tr><td style="color:#aaa;font-size:13px;">Dirección: <span style="color:#fff;">${direccion}</span></td></tr>` : ''}
                      </table>
                      <table style="background:#1a1a1a;border-radius:10px;padding:20px;width:100%;" cellpadding="0" cellspacing="0">
                        <tr><td style="color:#f97316;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding-bottom:12px;">Pago</td></tr>
                        <tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">
                          ${esApartado ? 'Anticipo' : 'Total'}: <span style="color:#f97316;font-weight:900;font-size:18px;">$${pago.transaction_amount?.toLocaleString('es-MX')} MXN</span>
                        </td></tr>
                        ${esApartado && monto_liquidacion ? `<tr><td style="color:#aaa;font-size:13px;padding-bottom:8px;">Pendiente de liquidar: <span style="color:#fff;">$${monto_liquidacion?.toLocaleString('es-MX')} MXN</span></td></tr>` : ''}
                        <tr><td style="color:#aaa;font-size:13px;">ID Mercado Pago: <span style="color:#fff;">${paymentId}</span></td></tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 40px 40px;">
                      ${tablaProductosHtml(itemsParaCorreo)}
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#0a0a0a;padding:20px 40px;border-top:1px solid #222;">
                      <p style="color:#444;font-size:11px;margin:0;text-align:center;">Sistema automático Hecatombe Coleccionables</p>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `
      })
    } catch (e) {
      console.error(`Error enviando emails de confirmación para pedido #${pedido?.id}:`, e)
      await alertarAdmin(
        `⚠️ Pedido #${pedido?.id} procesado pero no se enviaron los correos de confirmación`,
        `Payment ID: ${paymentId}\nCliente: ${userEmail}\nPedido: #${pedido?.id}\nMonto: $${pago.transaction_amount}\nError: ${e.message}\n\nEl pedido, stock y Hecacoins ya se procesaron — solo falló el envío de los correos. Avisar al cliente manualmente si hace falta.`
      )
    }

    return { status: 'creado', pedidoId: pedido?.id ?? null, mensaje: 'Pedido creado y procesado' }
  } catch (error) {
    console.error('procesarPagoAprobado error:', error)
    try {
      await alertarAdmin(
        '🚨 Error procesando pago aprobado — venta posiblemente no procesada',
        `Payment ID: ${pago?.id}\nError: ${error.message}\nHora: ${new Date().toISOString()}`
      )
    } catch {}
    return { status: 'error', pedidoId: null, mensaje: error.message }
  }
}
