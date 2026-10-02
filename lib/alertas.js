// Alerta por correo a los admins de Hecatombe cuando algo falla en un flujo
// de pago — nunca debe tragarse en silencio (console.error se queda en logs
// de Vercel que nadie revisa en el momento).
export async function alertarAdmin(resend, asunto, detalle) {
  try {
    await resend.emails.send({
      from: 'Hecatombe Sistema <noreply@hecatombe.com.mx>',
      to: 'hecatombe.9194@gmail.com',
      subject: asunto,
      html: `<pre style="font-family:monospace;white-space:pre-wrap;">${detalle}</pre>`,
    })
  } catch (e) {
    console.error('No se pudo enviar alerta al admin:', e)
  }
}
