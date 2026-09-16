// Integración con Solo Envíos (app.soloenvios.com) — cotización y generación
// de guías de envío. Solo se usa en el servidor (usa el client secret),
// nunca importar desde componentes de cliente.

import { CARTA_PORTE_COLECCIONABLES, TIPO_EMPAQUE_CAJA } from '@/lib/constants'

// SOLOENVIOS_ENV=sandbox usa la cuenta de pruebas (no cobra saldo real ni
// genera envíos reales con las paqueterías) — se deja en 'production' por
// defecto para que nunca quede en sandbox sin querer.
const ES_SANDBOX = process.env.SOLOENVIOS_ENV === 'sandbox'
const BASE_URL = ES_SANDBOX ? 'https://sb-app.soloenvios.com' : 'https://app.soloenvios.com'
const CLIENT_ID = ES_SANDBOX ? process.env.SOLOENVIOS_SANDBOX_CLIENT_ID : process.env.SOLOENVIOS_CLIENT_ID
const CLIENT_SECRET = ES_SANDBOX ? process.env.SOLOENVIOS_SANDBOX_CLIENT_SECRET : process.env.SOLOENVIOS_CLIENT_SECRET
const ORIGEN_ID = ES_SANDBOX ? process.env.SOLOENVIOS_SANDBOX_ORIGEN_ID : process.env.SOLOENVIOS_ORIGEN_ID

// El token dura 2h — se cachea en memoria del proceso serverless para no
// pedir uno nuevo en cada llamada (igual que el rate limit de checkout).
let tokenCache = { accessToken: null, expiresAt: 0 }

export async function getAccessToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken
  }

  const res = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  })

  if (!res.ok) {
    throw new Error(`No se pudo autenticar con Solo Envíos: ${res.status}`)
  }

  const data = await res.json()
  tokenCache = {
    accessToken: data.access_token,
    // Refrescamos 5 min antes de que expire de verdad, por márgen.
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  }
  return tokenCache.accessToken
}

async function soloEnviosFetch(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detalle = data?.error || data?.errors || data?.message || res.statusText
    throw new Error(`Solo Envíos ${path} falló (${res.status}): ${JSON.stringify(detalle)}`)
  }
  return data
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// Solo Envíos cotiza de forma asíncrona: el POST inicial casi siempre
// regresa "is_completed: false" con las tarifas en "pending" — hay que
// reconsultar hasta que termine (o se agote el tiempo de espera).
async function esperarCotizacionCompleta(quotationId, { maxWaitMs = 9000, intervalMs = 1000 } = {}) {
  const limite = Date.now() + maxWaitMs
  let data = await soloEnviosFetch(`/api/v1/quotations/${quotationId}`)
  while (!data.is_completed && Date.now() < limite) {
    await sleep(intervalMs)
    data = await soloEnviosFetch(`/api/v1/quotations/${quotationId}`)
  }
  return data
}

// direccion: fila de la tabla `direcciones` (calle, colonia, ciudad, estado, cp, ...)
// parcels: [{ weight, length, width, height }] en kg/cm
export async function cotizarEnvio({ direccion, parcels }) {
  const body = {
    quotation: {
      address_from: { address_template_id: ORIGEN_ID },
      address_to: {
        country_code: 'MX',
        postal_code: direccion.cp,
        area_level1: direccion.estado,
        area_level2: direccion.ciudad,
        area_level3: direccion.colonia,
      },
      parcels,
    },
  }

  const creada = await soloEnviosFetch('/api/v1/quotations', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const data = creada.is_completed ? creada : await esperarCotizacionCompleta(creada.id)

  // Solo tarifas encontradas y con precio real — el resto son paqueterías
  // sin cobertura para ese destino/peso o sin respuesta.
  const tarifas = (data.rates || []).filter(r => r.success && r.total)
  return { quotationId: data.id, tarifas }
}

// Vuelve a leer una cotización ya creada — se usa para verificar en el
// servidor que la tarifa que el cliente eligió sigue siendo válida antes
// de cobrarla (nunca se confía en el monto que manda el navegador).
export async function obtenerCotizacion(quotationId) {
  let data = await soloEnviosFetch(`/api/v1/quotations/${quotationId}`)
  if (!data.is_completed) data = await esperarCotizacionCompleta(quotationId)
  const tarifas = (data.rates || []).filter(r => r.success && r.total)
  return { quotationId: data.id, tarifas }
}

// Saldo disponible en la cuenta de Solo Envíos — para avisar antes de que
// se quede sin fondos y no pueda generar guías.
export async function obtenerSaldo() {
  const data = await soloEnviosFetch('/api/v1/finance/credits')
  return { balance: data.data?.balance ?? 0, currency: data.data?.currency || 'MXN' }
}

// Genera la guía real de un envío ya cotizado (POST /api/v1/shipments) y
// espera a que termine de procesarse (también es asíncrono, igual que las
// cotizaciones) para regresar el número de rastreo y el PDF de la guía.
// direccionDestino: { nombre, apellido, telefono, calle, colonia, ciudad,
// estado, cp, referencias, email }
// parcels: [{ weight, length, width, height }] — deben ser los mismos que
// se usaron para cotizar esa tarifa, o Solo Envíos puede rechazar el envío.
export async function crearEnvio({ rateId, direccionDestino, parcels }) {
  const body = {
    shipment: {
      rate_id: rateId,
      unique_shipment: true,
      address_from: { address_template_id: ORIGEN_ID },
      address_to: {
        name: `${direccionDestino.nombre} ${direccionDestino.apellido}`.trim(),
        company: 'N/A',
        phone: direccionDestino.telefono,
        email: direccionDestino.email,
        street1: direccionDestino.calle,
        reference: direccionDestino.referencias || 'Sin referencia',
        country_code: 'MX',
        postal_code: direccionDestino.cp,
        area_level1: direccionDestino.estado,
        area_level2: direccionDestino.ciudad,
        area_level3: direccionDestino.colonia,
      },
      packages: parcels.map((p, i) => ({
        package_number: String(i + 1),
        weight: p.weight,
        length: p.length,
        width: p.width,
        height: p.height,
        package_type: TIPO_EMPAQUE_CAJA,
        consignment_note: CARTA_PORTE_COLECCIONABLES,
      })),
    },
  }

  const creado = await soloEnviosFetch('/api/v1/shipments/', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  return esperarEnvioCompleto(creado.data.id)
}

const ESTADOS_TERMINALES = ['success', 'error', 'failed', 'completed']

async function esperarEnvioCompleto(shipmentId, { maxWaitMs = 25000, intervalMs = 1500 } = {}) {
  const limite = Date.now() + maxWaitMs
  let data = await soloEnviosFetch(`/api/v1/shipments/${shipmentId}`)
  while (!ESTADOS_TERMINALES.includes(data.data?.attributes?.workflow_status) && Date.now() < limite) {
    await sleep(intervalMs)
    data = await soloEnviosFetch(`/api/v1/shipments/${shipmentId}`)
  }

  const paquete = (data.included || []).find(inc => inc.attributes?.tracking_number)

  return {
    shipmentId: data.data.id,
    workflowStatus: data.data.attributes.workflow_status,
    trackingNumber: paquete?.attributes?.tracking_number || null,
    trackingUrl: paquete?.attributes?.tracking_url_provider || null,
    labelUrl: paquete?.attributes?.label_url || null,
    errorDetail: data.data.attributes.error_detail || null,
  }
}
