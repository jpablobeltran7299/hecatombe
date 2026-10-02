import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { getProductosPorIds } from '@/lib/sanity'
import { crearEnvio, obtenerCotizacion } from '@/lib/soloenvios'
import { armarParcels } from '@/lib/paquetes'
import { alertarAdmin } from '@/lib/alertas'
import { notificarPedidoEnviado } from '@/lib/envios'

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

    // Reserva atómica: un doble clic o dos pestañas abiertas no deben poder
    // generar (y cobrar) dos guías reales para el mismo pedido. El UPDATE
    // solo afecta la fila si `guia` sigue en null — si no afecta ninguna,
    // alguien más ya está generando o ya terminó.
    const { data: reservado, error: errorReserva } = await supabase
      .from('pedidos')
      .update({ guia: { generando: true, intento_en: new Date().toISOString() } })
      .eq('id', pedido_id)
      .is('guia', null)
      .select('id')

    if (errorReserva) {
      throw new Error(`No se pudo reservar el pedido para generar la guía: ${errorReserva.message}`)
    }
    if (!reservado || reservado.length === 0) {
      return NextResponse.json({ error: 'Este pedido ya tiene una guía generada o se está generando en este momento.' }, { status: 409 })
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

    let envio
    try {
      envio = await crearEnvio({
        rateId: rateIdFinal,
        direccionDestino: { ...pedido.direccion_snapshot, email: user.email },
        parcels,
      })
    } catch (e) {
      // No sabemos si Solo Envíos ya creó (y cobró) el shipment antes de que
      // la llamada fallara — por seguridad NO se libera la reserva para que
      // nadie pueda reintentar y generar una segunda guía real. Se deja el
      // pedido bloqueado hasta que un admin revise manualmente en Solo
      // Envíos y, si no se generó nada, limpie `pedidos.guia` a mano.
      await alertarAdmin(
        `🚨 Falló la generación de guía — pedido #${pedido_id} (revisar manualmente)`,
        `Error: ${e.message}\n\nNo se pudo confirmar si Solo Envíos alcanzó a crear el shipment antes de este error. Pedido #${pedido_id} quedó bloqueado (guia.generando=true) para evitar generar una segunda guía por error. Revisar en el panel de Solo Envíos si se generó o no, y si no, limpiar pedidos.guia a NULL manualmente para permitir reintentar.`
      )
      return NextResponse.json({ error: `Error generando la guía: ${e.message}. El pedido quedó bloqueado para revisión manual — no reintentes sin confirmar con Solo Envíos.` }, { status: 500 })
    }

    if (!envio.trackingNumber) {
      // Fallo limpio y confirmado por la API (no se generó ningún shipment)
      // — aquí sí es seguro liberar la reserva para permitir reintentar.
      await supabase.from('pedidos').update({ guia: null }).eq('id', pedido_id)
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
    await notificarPedidoEnviado(supabase, { pedido: { ...pedido, id: pedido_id }, guia })

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
