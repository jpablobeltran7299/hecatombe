import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/adminAuth'
import { extraerLineas } from '@/lib/pedidos'
import { alertarAdmin } from '@/lib/alertas'
import { notificarPedidoEnviado } from '@/lib/envios'

export const maxDuration = 60

// Misma lógica que /api/admin/registrar-guia-manual pero para un grupo de
// pedidos de Bodegatombe que se envían juntos con una sola guía.
export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const { user_id, trackingNumber, proveedor, trackingUrl, labelUrl } = await request.json()
    if (!user_id || !trackingNumber?.trim() || !proveedor?.trim()) {
      return NextResponse.json({ error: 'Falta el cliente, el número de guía o la paquetería.' }, { status: 400 })
    }

    const { data: pedidosGrupo } = await supabase
      .from('pedidos')
      .select('id, items, producto_id, direccion_snapshot, guia')
      .eq('user_id', user_id)
      .eq('destino', 'bodega')
      .eq('bodega_estado', 'solicitado')

    const pedidos = pedidosGrupo || []
    if (pedidos.length === 0) {
      return NextResponse.json({ error: 'Este cliente no tiene una solicitud de envío pendiente.' }, { status: 400 })
    }

    const direccion = pedidos.find(p => p.direccion_snapshot)?.direccion_snapshot

    const guia = {
      trackingNumber: trackingNumber.trim(),
      proveedor: proveedor.trim(),
      trackingUrl: trackingUrl?.trim() || null,
      labelUrl: labelUrl?.trim() || null,
      generado_en: new Date().toISOString(),
      manual: true,
    }

    const idsGrupo = pedidos.map(p => p.id)
    const { data: actualizados, error } = await supabase
      .from('pedidos')
      .update({ guia, bodega_estado: 'enviado' })
      .in('id', idsGrupo)
      .is('guia', null)
      .select('id')

    if (error) throw new Error(error.message)
    if (!actualizados || actualizados.length !== idsGrupo.length) {
      // Reversa parcial si alcanzó a actualizar algunos pedidos pero no todos.
      if (actualizados && actualizados.length > 0) {
        await supabase.from('pedidos').update({ guia: null, bodega_estado: 'solicitado' }).in('id', actualizados.map(r => r.id))
      }
      return NextResponse.json({ error: 'Este envío ya tiene una guía registrada.' }, { status: 409 })
    }

    const items = pedidos.flatMap(p => extraerLineas(p))
    await notificarPedidoEnviado(supabase, {
      pedido: {
        id: idsGrupo.join(', '),
        user_id,
        tipo_pedido: 'normal',
        items,
        direccion_snapshot: direccion,
      },
      guia,
    })

    return NextResponse.json({ ok: true, guia })
  } catch (error) {
    console.error('Error registrando guía manual de bodega:', error)
    await alertarAdmin(
      '🚨 Error en /api/admin/registrar-guia-manual-bodega',
      `Error: ${error.message}\n\nRevisar logs de Vercel para más contexto.\nHora: ${new Date().toISOString()}`
    )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
