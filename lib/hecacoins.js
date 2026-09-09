// Ajusta el saldo de Hecacoins de forma segura ante escrituras concurrentes
// (ej. dos pagos del mismo cliente procesándose casi al mismo tiempo).
// Lee el saldo actual y solo escribe si nadie más lo cambió mientras tanto
// (compare-and-swap sobre la columna `saldo`); si hubo choque, reintenta
// con el valor fresco. Evita que un update se pierda silenciosamente.
export async function ajustarHecacoins(supabase, userId, {
  saldoDelta = 0,
  ganadoDelta = 0,
  canjeadoDelta = 0,
  vencimiento = null,
  exigirSaldoSuficiente = false,
} = {}) {
  for (let intento = 0; intento < 5; intento++) {
    const { data: actual } = await supabase
      .from('hecacoins')
      .select('id, saldo, total_ganado, total_canjeado')
      .eq('user_id', userId)
      .single()

    if (!actual) {
      if (saldoDelta < 0) {
        if (exigirSaldoSuficiente) throw new Error('SALDO_INSUFICIENTE')
        return null
      }
      const { data: creado } = await supabase.from('hecacoins').insert({
        user_id: userId,
        saldo: saldoDelta,
        total_ganado: Math.max(0, ganadoDelta),
        total_canjeado: Math.max(0, canjeadoDelta),
        ...(vencimiento && { vencimiento }),
      }).select().single()
      return creado
    }

    if (exigirSaldoSuficiente && actual.saldo + saldoDelta < 0) {
      throw new Error('SALDO_INSUFICIENTE')
    }

    const nuevoSaldo = Math.max(0, actual.saldo + saldoDelta)
    const nuevoGanado = actual.total_ganado + ganadoDelta
    const nuevoCanjeado = actual.total_canjeado + canjeadoDelta

    const { data: actualizado } = await supabase
      .from('hecacoins')
      .update({
        saldo: nuevoSaldo,
        total_ganado: nuevoGanado,
        total_canjeado: nuevoCanjeado,
        ...(vencimiento && { vencimiento }),
      })
      .eq('id', actual.id)
      .eq('saldo', actual.saldo) // compare-and-swap: solo aplica si nadie más lo tocó
      .select()

    if (actualizado && actualizado.length > 0) return actualizado[0]
    // Alguien más escribió al mismo tiempo — reintentar leyendo el valor fresco.
  }
  throw new Error('No se pudo actualizar Hecacoins tras varios intentos (alta concurrencia)')
}
