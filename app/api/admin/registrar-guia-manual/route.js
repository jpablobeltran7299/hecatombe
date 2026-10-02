import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { alertarAdmin } from '@/lib/alertas'
import { notificarPedidoEnviado } from '@/lib/envios'

export const maxDuration = 60

// En la práctica, la guía casi siempre se genera directo en el panel de
// Solo Envíos (no con el botón de "Generar guía" de esta página) — así que
// sin esto, el cliente nunca se enteraba de que su pedido salió: no había
// forma de que el sistema supiera que una guía ya existía. Este endpoint
// deja que el admin pegue el número de guía que ya generó en Solo Envíos y
// dispara el mismo aviso al cliente y el mismo tracking en /cuenta.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { pedido_id, trackingNumber, proveedor, trackingUrl, labelUrl } = await request.json()
    if (!pedido_id || !trackingNumber?.trim() || !proveedor?.trim()) {
      return NextResponse.json({ error: 'Falta el pedido, el número de guía o la paquetería.' }, { status: 400 })
    }

    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, user_id, items, producto_id, tipo_pedido, destino, direccion_snapshot, guia')
      .eq('id', pedido_id)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 })
    }

    const guia = {
      trackingNumber: trackingNumber.trim(),
      proveedor: proveedor.trim(),
      trackingUrl: trackingUrl?.trim() || null,
      labelUrl: labelUrl?.trim() || null,
      generado_en: new Date().toISOString(),
      manual: true,
    }

    // UPDATE condicionado a que no exista guía ya — evita pisar una guía
    // real (generada por el botón automático o por otro admin) con esta.
    const update = pedido.destino === 'bodega'
      ? { guia, bodega_estado: 'enviado' }
      : { guia, estado: 'enviado' }

    const { data: actualizado, error } = await supabase
      .from('pedidos')
      .update(update)
      .eq('id', pedido_id)
      .is('guia', null)
      .select('id')

    if (error) throw new Error(error.message)
    if (!actualizado || actualizado.length === 0) {
      return NextResponse.json({ error: 'Este pedido ya tiene una guía registrada.' }, { status: 409 })
    }

    await notificarPedidoEnviado(supabase, { pedido, guia })

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error registrando guía manual:', error)
    await alertarAdmin(
      '🚨 Error en /api/admin/registrar-guia-manual',
      `Error: ${error.message}\n\nRevisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
