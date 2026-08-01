import { createClient } from 'npm:@supabase/supabase-js@2'
import { AdminFunctionError } from './admin-http.ts'

type AdminClient = ReturnType<typeof createClient>

function getSupabasePublicKey() {
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  if (publishableKeys) {
    const defaultKey = (JSON.parse(publishableKeys) as Record<string, string>).default
    if (defaultKey) return defaultKey
  }
  const localLegacyKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!localLegacyKey) throw new AdminFunctionError('CONFIGURATION_ERROR', 'Configuração interna indisponível.', 500)
  return localLegacyKey
}

export async function authorizeAdmin(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new AdminFunctionError('SESSION_REQUIRED', 'Sua sessão administrativa expirou. Entre novamente.', 401)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, getSupabasePublicKey(), {
    global: { headers: { Authorization: authorization } },
  })
  const { data: claims, error } = await supabase.auth.getClaims(authorization.replace('Bearer ', ''))
  if (
    error
    || claims?.claims?.aal !== 'aal2'
    || claims.claims.app_metadata?.role !== 'admin'
    || typeof claims.claims.sub !== 'string'
  ) {
    throw new AdminFunctionError('MFA_REQUIRED', 'Confirme novamente o código do autenticador para continuar.', 401)
  }
  return { supabase, userId: claims.claims.sub }
}

export function createServiceClient() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secretKeys) {
    const defaultKey = (JSON.parse(secretKeys) as Record<string, string>).default
    if (defaultKey) return createClient(Deno.env.get('SUPABASE_URL')!, defaultKey)
  }
  const legacyServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!legacyServiceKey) throw new AdminFunctionError('CONFIGURATION_ERROR', 'Configuração interna indisponível.', 500)
  return createClient(Deno.env.get('SUPABASE_URL')!, legacyServiceKey)
}

function required<T>(data: T | null, error: { code?: string; message: string } | null, message: string) {
  if (error?.code === 'PGRST116') throw new AdminFunctionError('NOT_FOUND', message, 404, { cause: error })
  if (error) throw new AdminFunctionError('DATABASE_ERROR', 'Não foi possível carregar os dados do evento.', 500, { cause: error })
  if (data === null) throw new AdminFunctionError('VALIDATION_ERROR', message, 422)
  return data
}

function toBase64(value: string) {
  const bytes = new TextEncoder().encode(`\ufeff${value}`)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function fileSlug(value: string) {
  return value.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'evento'
}

export async function loadEventExport(supabase: AdminClient, eventId: string) {
  const [
    eventResult,
    settingsResult,
    raffleResult,
    prizesResult,
    productsResult,
    reservationsResult,
  ] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', eventId).single(),
    supabase.from('event_settings').select('event_export_email').single(),
    supabase.from('rifas').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('rifa_premios').select('*').eq('event_id', eventId).order('display_order'),
    supabase.from('produtos').select('*').eq('event_id', eventId).order('display_order'),
    supabase.from('reservas').select('*').eq('event_id', eventId).order('created_at'),
  ])
  const event = required(eventResult.data, eventResult.error, 'Evento não encontrado.')
  const settings = required(settingsResult.data, settingsResult.error, 'Configurações de Eventos ausentes.')
  if (raffleResult.error || prizesResult.error || productsResult.error || reservationsResult.error) {
    throw new AdminFunctionError('DATABASE_ERROR', 'Não foi possível carregar os dados do evento.', 500, {
      cause: raffleResult.error ?? prizesResult.error ?? productsResult.error ?? reservationsResult.error,
    })
  }

  const products = productsResult.data ?? []
  const reservations = reservationsResult.data ?? []
  const productIds = products.map((product) => product.id)
  const reservationIds = reservations.map((reservation) => reservation.id)
  const sessionIds = reservations.map((reservation) => reservation.session_id)
  const [variationsResult, reservationProductsResult, numbersResult, sessionsResult] = await Promise.all([
    productIds.length
      ? supabase.from('produto_variacoes').select('*').in('product_id', productIds).order('display_order')
      : Promise.resolve({ data: [], error: null }),
    reservationIds.length
      ? supabase.from('reserva_produtos').select('*').in('reservation_id', reservationIds).order('id')
      : Promise.resolve({ data: [], error: null }),
    reservationIds.length
      ? supabase.from('reserva_numeros').select('*').in('reservation_id', reservationIds).order('number')
      : Promise.resolve({ data: [], error: null }),
    sessionIds.length
      ? supabase.from('sessoes_reserva').select('*').in('id', sessionIds).order('created_at')
      : Promise.resolve({ data: [], error: null }),
  ])
  const relationError = variationsResult.error ?? reservationProductsResult.error
    ?? numbersResult.error ?? sessionsResult.error
  if (relationError) throw new AdminFunctionError('DATABASE_ERROR', 'Não foi possível carregar os dados relacionados ao evento.', 500, { cause: relationError })

  const variations = variationsResult.data ?? []
  const reservationProducts = reservationProductsResult.data ?? []
  const variationIds = variations.map((variation) => variation.id)
  const reservationProductIds = reservationProducts.map((item) => item.id)
  const [optionsResult, reservationOptionsResult] = await Promise.all([
    variationIds.length
      ? supabase.from('produto_variacao_opcoes').select('*').in('variation_id', variationIds).order('display_order')
      : Promise.resolve({ data: [], error: null }),
    reservationProductIds.length
      ? supabase.from('reserva_produto_opcoes').select('*').in('reservation_product_id', reservationProductIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (optionsResult.error || reservationOptionsResult.error) {
    throw new AdminFunctionError('DATABASE_ERROR', 'Não foi possível carregar as opções reservadas.', 500, {
      cause: optionsResult.error ?? reservationOptionsResult.error,
    })
  }

  const exportData = {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    event,
    catalog: {
      raffle: raffleResult.data,
      raffle_prizes: prizesResult.data ?? [],
      products,
      product_variations: variations,
      product_variation_options: optionsResult.data ?? [],
    },
    reservations: {
      records: reservations,
      sessions: sessionsResult.data ?? [],
      products: reservationProducts,
      product_options: reservationOptionsResult.data ?? [],
      raffle_numbers: numbersResult.data ?? [],
    },
  }
  const csvRows = [
    ['ID', 'Nome', 'Contato', 'Status', 'Total', 'Comprovante salvo', 'Expira em', 'Pago em', 'Cancelado em', 'Entregue em', 'Criado em'],
    ...reservations.map((row) => [
      row.id,
      row.customer_name,
      row.customer_contact,
      row.status,
      (row.total_cents / 100).toFixed(2),
      row.receipt_saved ? 'Sim' : 'Não',
      row.expires_at,
      row.paid_at,
      row.canceled_at,
      row.delivered_at,
      row.created_at,
    ]),
  ]
  const photoPaths = [
    ...(event.photos ?? []),
    ...(prizesResult.data ?? []).map((prize) => prize.photo),
    ...products.flatMap((product) => [
      ...(product.photos ?? []),
      ...(product.measurement_image ? [product.measurement_image] : []),
    ]),
  ]

  return {
    event,
    exportEmail: settings.event_export_email,
    json: JSON.stringify(exportData, null, 2),
    reservationsCsv: csvRows.map((row) => row.map(csvCell).join(',')).join('\n'),
    photoPaths: [...new Set(photoPaths)],
  }
}

export async function sendEventExport(eventExport: Awaited<ReturnType<typeof loadEventExport>>) {
  if (!eventExport.exportEmail) throw new AdminFunctionError('VALIDATION_ERROR', 'Configure o e-mail de exportação antes de continuar.', 422)
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!resendApiKey || !from) throw new AdminFunctionError('CONFIGURATION_ERROR', 'O envio de auditoria ainda não está configurado.', 500)
  const filename = fileSlug(eventExport.event.name ?? 'evento')
  const eventName = escapeHtml(eventExport.event.name ?? 'evento')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [eventExport.exportEmail],
      subject: `Cópia automática — ${eventExport.event.name}`,
      html: `<p>A cópia completa dos dados de <strong>${eventName}</strong> segue anexada antes da exclusão.</p><p>O arquivo JSON contém evento, catálogo, sorteios e reservas; o CSV facilita a leitura das reservas.</p>`,
      attachments: [
        { content: toBase64(eventExport.json), filename: `${filename}-dados.json` },
        { content: toBase64(eventExport.reservationsCsv), filename: `${filename}-reservas.csv` },
      ],
    }),
  }).catch((error) => {
    throw new AdminFunctionError('RESEND_ERROR', 'O serviço de e-mail não respondeu. Nada foi excluído.', 502, { cause: error })
  })
  if (!response.ok) throw new AdminFunctionError('RESEND_ERROR', 'O serviço de e-mail recusou a exportação. Nada foi excluído.', 502)
  return new Date().toISOString()
}

export async function removeEventPhotos(supabase: AdminClient, paths: string[]) {
  if (!paths.length) return null
  const { error } = await supabase.storage.from('dog-photos').remove(paths)
  return error?.message ?? null
}
