// Alerta por correo a los admins de Hecatombe cuando algo falla en un flujo
// de pago — nunca debe tragarse en silencio (console.error se queda en logs
// de Vercel que nadie revisa en el momento).
//
// Manda el correo a mano con fetch directo a la API de Resend (no usa el
// SDK/cliente `resend`) a propósito: así esta alerta sigue funcionando aunque
// la construcción de otros clientes (Supabase, Sanity, MercadoPago, o el
// propio cliente Resend) haya sido lo que falló — es el único camino que no
// puede depender de lo que se está reportando como roto.
export async function alertarAdmin(asunto, detalle) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('No se pudo enviar alerta al admin: falta RESEND_API_KEY')
      return
    }
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
        to: ['hecatombe.9194@gmail.com', 'jpablobeltran7299@gmail.com'],
        subject: asunto,
        html: `<pre style="font-family:monospace;white-space:pre-wrap;">${detalle}</pre>`,
      }),
    })
  } catch (e) {
    console.error('No se pudo enviar alerta al admin:', e)
  }
}
