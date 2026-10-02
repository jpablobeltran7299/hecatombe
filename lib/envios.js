import { Resend } from 'resend'
import { getProductosPorIds } from '@/lib/sanity'
import { alertarAdmin } from '@/lib/alertas'
import { plantillaEnvioGenerado, BCC_MONITOREO_CLIENTES } from '@/lib/emailTemplates'

// Avisarle al cliente que su pedido ya salió — usado tanto cuando la guía
// se genera automáticamente desde la página (crearEnvio) como cuando un
// admin la registra a mano porque la generó directo en Solo Envíos (que es
// el camino más común en la práctica).
export async function notificarPedidoEnviado(supabase, { pedido, guia }) {
  const { data: { user } } = await supabase.auth.admin.getUserById(pedido.user_id)
  const userEmail = user?.email

  try {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, apellido')
      .eq('user_id', pedido.user_id)
      .single()
    const nombreCliente = perfil?.nombre ? `${perfil.nombre} ${perfil.apellido || ''}`.trim() : (userEmail || 'cliente')

    const direccion = pedido.direccion_snapshot
      ? `${pedido.direccion_snapshot.calle}, ${pedido.direccion_snapshot.colonia}, ${pedido.direccion_snapshot.ciudad}, ${pedido.direccion_snapshot.estado} CP ${pedido.direccion_snapshot.cp}`
      : 'No proporcionada'

    const itemsPedido = pedido.tipo_pedido === 'normal'
      ? (pedido.items || [])
      : (pedido.producto_id ? [{ producto_id: pedido.producto_id, cantidad: 1, nombre: null, precio: null, imagen: null }] : (pedido.items || []))

    const ids = itemsPedido.map(i => i.producto_id).filter(Boolean)
    const productos = ids.length > 0 ? await getProductosPorIds(ids) : []
    const productosMap = {}
    productos.forEach(p => { productosMap[p._id] = p })

    const itemsParaCorreo = itemsPedido.map(i => ({
      title: productosMap[i.producto_id]?.nombre || i.nombre || 'Producto',
      quantity: i.cantidad || 1,
      unitPrice: productosMap[i.producto_id]?.precio || i.precio || 0,
      pictureUrl: i.imagen || null,
    }))

    if (!userEmail) throw new Error('No se encontró el correo del cliente')

    const { asunto, html } = plantillaEnvioGenerado({
      nombreCliente,
      pedidoId: pedido.id,
      proveedor: guia.proveedor,
      trackingNumber: guia.trackingNumber,
      trackingUrl: guia.trackingUrl,
      direccion,
      items: itemsParaCorreo,
    })

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Hecatombe Coleccionables <noreply@hecatombe.com.mx>',
      to: userEmail,
      bcc: BCC_MONITOREO_CLIENTES,
      subject: asunto,
      html,
    })
  } catch (e) {
    console.error(`Error enviando correo de guía generada para pedido #${pedido.id}:`, e)
    await alertarAdmin(
      `⚠️ Guía generada pero no se avisó al cliente — pedido #${pedido.id}`,
      `La guía sí se generó/registró correctamente (tracking: ${guia.trackingNumber}), pero falló el correo de aviso al cliente.\nError: ${e.message}\n\nAvisarle manualmente si hace falta.`
    )
  }
}
