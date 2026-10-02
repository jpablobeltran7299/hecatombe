import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { crearEnvio, obtenerCotizacion } from '@/lib/soloenvios'
import { armarParcels } from '@/lib/paquetes'
import { alertarAdmin } from '@/lib/alertas'
import { plantillaEnvioGenerado, BCC_MONITOREO_CLIENTES } from '@/lib/emailTemplates'

export const maxDuration = 60

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { pedido_id, quotation_id, rate_id } = await request.json()
    if (!pedido_id) {
      return NextResponse.json({ error: 'Falta pedido_id.' }, { status: 400 })
    }

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, user_id, items, producto_id, tipo_pedido, destino, envio_cotizacion, direccion_snapshot, guia')
      .eq('id', pedido_id)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }
    if (pedido.destino === 'bodega') {
      return NextResponse.json({ error: 'Este pedido va a Bodegatombe, no necesita guía todavía.' }, { status: 400 })
    }
    if (pedido.guia?.trackingNumber) {
      return NextResponse.json({ error: 'Este pedido ya tiene una guía generada.' }, { status: 400 })
    }
    if (!pedido.direccion_snapshot) {
      return NextResponse.json({ error: 'Este pedido no tiene una dirección de envío guardada.' }, { status: 400 })
    }

    // Pedidos con envío gratis (superaron el monto de Bodegatombe) nunca
    // guardan una cotización al pagar — hay que cotizar aquí y que el
    // admin elija, igual que en Bodegatombe.
    const rateIdFinal = rate_id || pedido.envio_cotizacion?.rate_id
    const quotationIdFinal = quotation_id || pedido.envio_cotizacion?.quotation_id
    if (!rateIdFinal || !quotationIdFinal) {
      return NextResponse.json({ error: 'Este pedido no tiene una cotización de envío — cotiza primero para elegir una paquetería.' }, { status: 400 })
    }

    const { tarifas } = await obtenerCotizacion(quotationIdFinal)
    const tarifaElegida = tarifas.find(t => t.id === rateIdFinal)
    if (!tarifaElegida) {
      return NextResponse.json({ error: 'La tarifa elegida ya no es válida. Vuelve a cotizar.' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.admin.getUserById(pedido.user_id)
    if (!user?.email) {
      return NextResponse.json({ error: 'No se encontró el correo del cliente.' }, { status: 400 })
    }

    // Mismos "paquetes" que se usaron para cotizar — un paquete por pieza.
    const itemsPedido = pedido.tipo_pedido === 'normal'
      ? (pedido.items || [])
      : (pedido.producto_id ? [{ producto_id: pedido.producto_id, cantidad: 1 }] : [])

    const ids = itemsPedido.map(i => i.producto_id)
    const productos = await getProductosPorIds(ids)
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const parcels = armarParcels(itemsPedido, productosMap)

    const envio = await crearEnvio({
      rateId: rateIdFinal,
      direccionDestino: { ...pedido.direccion_snapshot, email: user.email },
      parcels,
    })

    if (!envio.trackingNumber) {
      return NextResponse.json({
        error: `No se pudo generar la guía (estado: ${envio.workflowStatus}). ${envio.errorDetail?.error_message || ''}`,
      }, { status: 502 })
    }

    const guia = {
      shipment_id: envio.shipmentId,
      trackingNumber: envio.trackingNumber,
      trackingUrl: envio.trackingUrl,
      labelUrl: envio.labelUrl,
      proveedor: tarifaElegida.provider_display_name,
      generado_en: new Date().toISOString(),
    }
    const envioCotizacion = {
      quotation_id: quotationIdFinal,
      rate_id: rateIdFinal,
      proveedor: tarifaElegida.provider_display_name,
      servicio: tarifaElegida.provider_service_name,
      total: parseFloat(tarifaElegida.total),
      dias: tarifaElegida.days,
    }

    await supabase.from('pedidos').update({ guia, envio_cotizacion: envioCotizacion, estado: 'enviado' }).eq('id', pedido_id)

    // Avisarle al cliente que su pedido ya salió — antes este paso generaba
    // la guía real con la paquetería pero no le avisaba a nadie.
    try {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('nombre, apellido')
        .eq('user_id', pedido.user_id)
        .single()
      const nombreCliente = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : user.email

      const direccion = pedido.direccion_snapshot
        ? `${pedido.direccion_snapshot.calle}, ${pedido.direccion_snapshot.colonia}, ${pedido.direccion_snapshot.ciudad}, ${pedido.direccion_snapshot.estado} CP ${pedido.direccion_snapshot.cp}`
        : 'No proporcionada'

      const itemsParaCorreo = itemsPedido.map(i => ({
        title: productosMap[i.producto_id]?.nombre || i.nombre || 'Producto',
        quantity: i.cantidad || 1,
        unitPrice: productosMap[i.producto_id]?.precio || i.precio || 0,
        pictureUrl: i.imagen || null,
      }))

      const { asunto, html } = plantillaEnvioGenerado({
        nombreCliente,
        pedidoId: pedido_id,
        proveedor: guia.proveedor,
        trackingNumber: guia.trackingNumber,
        trackingUrl: guia.trackingUrl,
        direccion,
        items: itemsParaCorreo,
      })

      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
        to: user.email,
        bcc: BCC_MONITOREO_CLIENTES,
        subject: asunto,
        html,
      })
    } catch (e) {
      console.error(`Error enviando correo de guía generada para pedido #${pedido_id}:`, e)
      await alertarAdmin(
        `⚠️ Guía generada pero no se avisó al cliente — pedido #${pedido_id}`,
        `La guía sí se generó correctamente (tracking: ${guia.trackingNumber}), pero falló el correo de aviso al cliente.\nError: ${e.message}\n\nAvisarle manualmente si hace falta.`
      )
    }

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error generando guía de envío:', error)
    await alertarAdmin(
      '🚨 Error en /api/admin/generar-envio',
      `Error: ${error.message}\n\nRevisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
