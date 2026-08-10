import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Json, Tables, TablesInsert } from '../database.types'
import { getAdminErrorMessage, parseAdminFunctionError } from '../admin/adminErrors'
import { mapAuditMetadata } from '../admin/audit'
import type { AuditMetadata } from '../admin/audit'
import {
  getStoredPhotoUrl,
  removeStoredPhotos,
  toEditablePhotos,
  uploadNewPhotos,
} from '../images/storagePhotos'
import type { EditablePhoto } from '../images/storagePhotos'
import { supabase } from '../supabase/client'

export type EventKind = 'product' | 'raffle'
export type EventStatus = 'active' | 'archived' | 'draft' | 'ended'
export type ReservationStatus = 'canceled' | 'delivered' | 'paid' | 'reserved'

export type ProductOption = { id: string; name: string }
export type ProductVariation = { id: string; name: string; options: ProductOption[] }

export type MeasurementTable = {
  variationId?: string
  sizes: string[]
  sections: { title: string; rows: { label: string; values: string[] }[] }[]
}

export type ProductMeasurementGuide =
  | { kind: 'image'; path: string }
  | { kind: 'table'; table: MeasurementTable }

export type EventProduct = {
  description: string
  discountMinimum: string
  discountPrice: string
  gallery: string[]
  id: string
  measurementGuide?: ProductMeasurementGuide
  name: string
  price: string
  variations: ProductVariation[]
}

export type EditableEventProduct = Omit<EventProduct, 'gallery' | 'measurementGuide'> & {
  gallery: EditablePhoto[]
  measurementGuide?:
    | { kind: 'image'; photo: EditablePhoto }
    | { kind: 'table'; table: MeasurementTable }
}

export type RafflePrize = {
  drawnAt?: string
  id: string
  image: string
  name: string
  winnerName?: string
  winningNumber?: number
}

export type EditableRafflePrize = Omit<RafflePrize, 'image'> & { image: EditablePhoto }

export type FundraisingEvent = {
  audit: AuditMetadata | null
  city: string
  description: string
  endDate: string
  fundraisingGoal: string
  gallery: string[]
  id: string
  kind: EventKind
  maxItemsPerReservation: string
  paymentKey: string
  paymentReceiver: string
  postPaymentInstructions: string
  products: EventProduct[]
  prizes: RafflePrize[]
  raffleNumberPrice: string
  raffleTotalNumbers: string
  receiptFolderUrl: string
  reservationTtlMinutes: string
  startDate: string
  status: EventStatus
  title: string
}

export type EventDraft = Omit<FundraisingEvent, 'audit' | 'gallery' | 'id' | 'prizes' | 'products' | 'status'> & {
  gallery: EditablePhoto[]
  id?: string
  prizes: EditableRafflePrize[]
  products: EditableEventProduct[]
  status?: EventStatus
}

export type ReservationProductItem = {
  id: string
  options: Record<string, { optionId: string; optionName: string; variationName: string }>
  productId: string | null
  productName: string
  unitPriceCents: number
}

export type EventReservation = {
  audit: AuditMetadata | null
  contact: string
  eventId: string
  expiresAt: string
  id: string
  name: string
  numbers: number[]
  productItems: ReservationProductItem[]
  receiptSaved: boolean
  referenceCode: string
  status: ReservationStatus
  totalCents: number
}

export type EventReservationUpdate = {
  contact: string
  id: string
  name: string
  numbers: number[]
  productItems: { options: Record<string, string>; productId: string }[]
  receiptSaved: boolean
  status: ReservationStatus
}

export type ReservationResult = {
  expiresAt: string
  pixCity: string
  pixKey: string
  pixReceiver: string
  postPaymentInstructions: string
  reservationId: string
  totalCents: number
}

export type EventSettings = {
  audit?: AuditMetadata | null
  defaultMaxProductUnits: number
  defaultMaxRaffleNumbers: number
  defaultPostPaymentInstructions: string
  defaultReservationTtlMinutes: number
  eventExportEmail: string
}

const adminEventsKey = ['events', 'admin'] as const
const publicEventsKey = ['events', 'public'] as const
const eventSettingsKey = ['events', 'settings'] as const
const reservationsKey = (eventId: string) => ['events', eventId, 'reservations'] as const
const raffleNumbersKey = (eventId: string) => ['events', eventId, 'numbers'] as const

const EVENT_KIND_FROM_DB = { produtos: 'product', rifa: 'raffle' } as const
const EVENT_KIND_TO_DB = { product: 'produtos', raffle: 'rifa' } as const
const EVENT_STATUS_FROM_DB = {
  ativo: 'active',
  arquivado: 'archived',
  encerrado: 'ended',
  rascunho: 'draft',
} as const
const EVENT_STATUS_TO_DB = {
  active: 'ativo',
  archived: 'arquivado',
  draft: 'rascunho',
  ended: 'encerrado',
} as const
const RESERVATION_STATUS_FROM_DB = {
  cancelada: 'canceled',
  entregue: 'delivered',
  paga: 'paid',
  pendente: 'reserved',
} as const
const RESERVATION_STATUS_TO_DB = {
  canceled: 'cancelada',
  delivered: 'entregue',
  paid: 'paga',
  reserved: 'pendente',
} as const

type EventRow = Tables<'eventos'> | Tables<'eventos_public'>
type ProductRow = Tables<'produtos'> | Tables<'produtos_public'>
type VariationRow = Tables<'produto_variacoes'> | Tables<'produto_variacoes_public'>
type OptionRow = Tables<'produto_variacao_opcoes'> | Tables<'produto_variacao_opcoes_public'>
type PrizeRow = Tables<'rifa_premios'> | Tables<'rifa_premios_public'>
type RaffleRow = Tables<'rifas'> | Tables<'rifas_public'>

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message)
  return value
}

export function parseCurrencyToCents(value: string) {
  const normalized = value.trim().replace(/\s/g, '').replace(/^R\$/, '')
  if (!normalized) return 0
  const comma = normalized.lastIndexOf(',')
  const dot = normalized.lastIndexOf('.')
  const decimalIndex = Math.max(comma, dot)
  const hasDecimal = decimalIndex >= 0 && normalized.length - decimalIndex <= 3
  const integer = (hasDecimal ? normalized.slice(0, decimalIndex) : normalized).replace(/\D/g, '')
  const decimal = hasDecimal ? normalized.slice(decimalIndex + 1).replace(/\D/g, '').padEnd(2, '0').slice(0, 2) : '00'
  return Number(integer || '0') * 100 + Number(decimal)
}

export function formatCentsForInput(value: number | null | undefined) {
  if (value === null || value === undefined) return ''
  return (value / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const integer = padded.slice(0, -2).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${integer},${padded.slice(-2)}`
}

export function getEventErrorMessage(error: unknown, fallback: string) {
  return getAdminErrorMessage(error, fallback)
}

function isPositiveInteger(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0
}

export function getEventPublicationError(
  event: FundraisingEvent,
  options: { activeEventId?: string; defaultMaxProductUnits?: number; today?: string } = {},
) {
  if (options.activeEventId && options.activeEventId !== event.id) return 'Já existe outro evento ativo. Encerre-o antes de publicar este evento.'
  if (!event.title.trim()) return 'Preencha o título do evento.'
  if (!event.description.trim()) return 'Preencha a descrição do evento.'
  if (!event.startDate) return 'Informe a data de início.'
  if (!event.endDate) return 'Informe a data de fim.'
  if (event.startDate > event.endDate) return 'A data de fim não pode ser anterior à data de início.'
  const today = options.today ?? new Date().toISOString().slice(0, 10)
  if (today < event.startDate || today > event.endDate) return 'Um evento só pode ser publicado dentro do período informado.'
  if (parseCurrencyToCents(event.fundraisingGoal) <= 0) return 'Informe uma meta de arrecadação maior que zero.'
  if (event.maxItemsPerReservation && !isPositiveInteger(event.maxItemsPerReservation)) return 'O máximo por reserva deve ser um número inteiro maior que zero.'
  if (event.reservationTtlMinutes && !isPositiveInteger(event.reservationTtlMinutes)) return 'O tempo de expiração deve corresponder a pelo menos 1 minuto.'
  if (event.gallery.length === 0) return 'Adicione ao menos uma imagem à galeria de divulgação do evento.'

  if (event.kind === 'raffle') {
    if (!isPositiveInteger(event.raffleTotalNumbers) || Number(event.raffleTotalNumbers) > 1000) return 'A quantidade de números da rifa deve ser um inteiro entre 1 e 1.000.'
    if (parseCurrencyToCents(event.raffleNumberPrice) <= 0) return 'Informe um valor por número maior que zero.'
    if (event.prizes.length === 0) return 'Adicione ao menos um prêmio à rifa.'
    const invalidPrizeIndex = event.prizes.findIndex((prize) => !prize.name.trim() || !prize.image)
    if (invalidPrizeIndex >= 0) return `Prêmio ${invalidPrizeIndex + 1}: preencha o nome e a imagem.`
  } else {
    if (event.products.length === 0) return 'Adicione ao menos um produto ao catálogo.'
    const normalizedNames = event.products.map((product) => product.name.trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
    if (new Set(normalizedNames).size !== normalizedNames.length) return 'Cada produto do catálogo precisa ter um nome diferente.'
    const effectiveMaximum = Number(event.maxItemsPerReservation) || options.defaultMaxProductUnits || 10

    for (const [productIndex, product] of event.products.entries()) {
      const label = `Produto ${productIndex + 1}${product.name.trim() ? ` (${product.name.trim()})` : ''}`
      if (!product.name.trim()) return `${label}: preencha o nome.`
      if (!product.description.trim()) return `${label}: preencha a descrição.`
      if (parseCurrencyToCents(product.price) <= 0) return `${label}: informe um preço maior que zero.`
      if (product.gallery.length === 0) return `${label}: adicione ao menos uma imagem.`
      const hasDiscountPrice = parseCurrencyToCents(product.discountPrice) > 0
      const hasDiscountMinimum = Boolean(product.discountMinimum)
      if (hasDiscountPrice !== hasDiscountMinimum) return `${label}: preencha juntos o preço com desconto e a quantidade mínima.`
      if (hasDiscountPrice && parseCurrencyToCents(product.discountPrice) >= parseCurrencyToCents(product.price)) return `${label}: o preço com desconto deve ser menor que o preço normal.`
      if (hasDiscountMinimum && (!isPositiveInteger(product.discountMinimum) || Number(product.discountMinimum) < 2)) return `${label}: a quantidade mínima para desconto deve ser um inteiro igual ou maior que 2.`
      if (hasDiscountMinimum && Number(product.discountMinimum) > effectiveMaximum) return `${label}: a quantidade mínima para desconto deve ser igual ou menor que o máximo de ${effectiveMaximum} unidades por reserva.`

      for (const [variationIndex, variation] of product.variations.entries()) {
        if (!variation.name.trim()) return `${label}: preencha o nome da variação ${variationIndex + 1}.`
        if (variation.options.length === 0) return `${label}: adicione ao menos um valor à variação “${variation.name}”.`
      }
      const variationNames = product.variations.map((variation) => variation.name.trim().toLocaleLowerCase('pt-BR'))
      if (new Set(variationNames).size !== variationNames.length) return `${label}: cada variação precisa ter um nome diferente.`
      if (product.measurementGuide?.kind === 'image' && !product.measurementGuide.path) return `${label}: envie a imagem do guia de medidas ou remova o guia.`
      if (product.measurementGuide?.kind === 'table') {
        const { table } = product.measurementGuide
        const hasSourceVariation = product.variations.some((variation) => (
          variation.options.length > 0 &&
          (variation.id === table.variationId || (
            variation.options.length === table.sizes.length &&
            variation.options.every((option, index) => option.name === table.sizes[index])
          ))
        ))
        if (!hasSourceVariation || table.sizes.length === 0) return `${label}: selecione a variação usada na tabela de medidas.`
        if (table.sections.length === 0 || table.sections.some((section) => section.rows.length === 0)) return `${label}: adicione ao menos uma medida à tabela.`
        if (table.sections.some((section) => section.rows.some((row) => !row.label.trim() || row.values.length !== table.sizes.length || row.values.some((value) => !value.trim())))) return `${label}: preencha todos os nomes e valores da tabela de medidas.`
      }
    }
  }

  if (!event.postPaymentInstructions.trim()) return 'Preencha as instruções pós-pagamento.'
  if (!event.paymentKey.trim() || !event.paymentReceiver.trim() || !event.city.trim()) return 'Informe chave, recebedor e cidade do Pix antes de publicar.'
  if (event.receiptFolderUrl) {
    try {
      if (new URL(event.receiptFolderUrl).protocol !== 'https:') throw new Error()
    } catch {
      return 'O link externo dos comprovantes deve ser uma URL HTTPS válida.'
    }
  }
  return null
}

function intervalToMinutes(value: string | null | undefined) {
  if (!value) return ''
  const dayMatch = value.match(/(\d+) day/)
  const timeMatch = value.match(/(?:(\d+):)?(\d+):(\d+)/)
  const days = Number(dayMatch?.[1] ?? 0)
  const hours = Number(timeMatch?.[1] ?? 0)
  const minutes = Number(timeMatch?.[2] ?? 0)
  return String(days * 1440 + hours * 60 + minutes)
}

function minutesToInterval(value: string) {
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes} minutes` : null
}

function mapMeasurement(row: ProductRow): ProductMeasurementGuide | undefined {
  if (row.measurement_image) return { kind: 'image', path: row.measurement_image }
  if (row.measurement_table) return { kind: 'table', table: row.measurement_table as MeasurementTable }
  return undefined
}

function composeEvents(
  eventRows: EventRow[],
  productRows: ProductRow[],
  variationRows: VariationRow[],
  optionRows: OptionRow[],
  raffleRows: RaffleRow[],
  prizeRows: PrizeRow[],
  preferDraftPayload = true,
) {
  return eventRows.map((row): FundraisingEvent => {
    const id = required(row.id, 'Evento sem identificador.')
    if (
      preferDraftPayload &&
      'draft_payload' in row &&
      row.status === 'rascunho' &&
      row.draft_payload &&
      typeof row.draft_payload === 'object' &&
      !Array.isArray(row.draft_payload)
    ) {
      return {
        ...(row.draft_payload as unknown as FundraisingEvent),
        audit: mapAuditMetadata(row),
        id,
        status: 'draft',
      }
    }
    const products = productRows
      .filter((product) => product.event_id === id)
      .sort((a, b) => required(a.display_order, 'Produto sem ordem.') - required(b.display_order, 'Produto sem ordem.'))
      .map((product): EventProduct => {
        const productId = required(product.id, 'Produto sem identificador.')
        const variations = variationRows
          .filter((variation) => variation.product_id === productId)
          .sort((a, b) => required(a.display_order, 'Variação sem ordem.') - required(b.display_order, 'Variação sem ordem.'))
          .map((variation): ProductVariation => ({
            id: required(variation.id, 'Variação sem identificador.'),
            name: required(variation.name, 'Variação sem nome.'),
            options: optionRows
              .filter((option) => option.variation_id === variation.id)
              .sort((a, b) => required(a.display_order, 'Opção sem ordem.') - required(b.display_order, 'Opção sem ordem.'))
              .map((option) => ({
                id: required(option.id, 'Opção sem identificador.'),
                name: required(option.name, 'Opção sem nome.'),
              })),
          }))
        return {
          id: productId,
          name: required(product.name, 'Produto sem nome.'),
          description: required(product.description, 'Produto sem descrição.'),
          gallery: product.photos ?? [],
          price: formatCentsForInput(product.unit_price_cents),
          discountMinimum: product.discount_min_quantity ? String(product.discount_min_quantity) : '',
          discountPrice: formatCentsForInput(product.discount_unit_price_cents),
          measurementGuide: mapMeasurement(product),
          variations,
        }
      })
    const raffle = raffleRows.find((item) => item.event_id === id)

    return {
      audit: mapAuditMetadata(row),
      id,
      kind: EVENT_KIND_FROM_DB[required(row.type, 'Evento sem tipo.')],
      status: EVENT_STATUS_FROM_DB[required(row.status, 'Evento sem status.')],
      title: row.name ?? '',
      description: row.description ?? '',
      startDate: row.start_date ?? '',
      endDate: row.end_date ?? '',
      fundraisingGoal: formatCentsForInput(row.fundraising_goal_cents),
      maxItemsPerReservation: row.max_items_per_reservation ? String(row.max_items_per_reservation) : '',
      reservationTtlMinutes: 'reservation_ttl' in row
        ? intervalToMinutes(row.reservation_ttl)
        : row.reservation_ttl_seconds ? String(Math.ceil(row.reservation_ttl_seconds / 60)) : '',
      gallery: row.photos ?? [],
      products,
      raffleTotalNumbers: raffle?.total_numbers ? String(raffle.total_numbers) : '',
      raffleNumberPrice: formatCentsForInput(raffle?.number_price_cents),
      prizes: prizeRows
        .filter((prize) => prize.event_id === id)
        .sort((a, b) => required(a.display_order, 'Prêmio sem ordem.') - required(b.display_order, 'Prêmio sem ordem.'))
        .map((prize) => ({
          id: required(prize.id, 'Prêmio sem identificador.'),
          name: required(prize.name, 'Prêmio sem nome.'),
          image: required(prize.photo, 'Prêmio sem foto.'),
          winningNumber: prize.winning_number ?? undefined,
          winnerName: 'winner_name' in prize ? prize.winner_name ?? undefined : undefined,
          drawnAt: prize.drawn_at ?? undefined,
        })),
      paymentKey: 'pix_key' in row ? row.pix_key ?? '' : '',
      paymentReceiver: 'pix_receiver' in row ? row.pix_receiver ?? '' : '',
      city: 'pix_city' in row ? row.pix_city ?? '' : '',
      postPaymentInstructions: row.post_payment_instructions ?? '',
      receiptFolderUrl: 'receipt_folder_url' in row ? row.receipt_folder_url ?? '' : '',
    }
  })
}

type EventRelationRows = {
  events: EventRow[]
  options: OptionRow[]
  prizes: PrizeRow[]
  products: ProductRow[]
  raffles: RaffleRow[]
  variations: VariationRow[]
}

async function loadEventRelationRows(publicOnly: boolean): Promise<EventRelationRows> {
  const results = publicOnly
    ? await Promise.all([
        supabase.from('eventos_public').select('*'),
        supabase.from('produtos_public').select('*'),
        supabase.from('produto_variacoes_public').select('*'),
        supabase.from('produto_variacao_opcoes_public').select('*'),
        supabase.from('rifas_public').select('*'),
        supabase.from('rifa_premios_public').select('id,event_id,name,photo,display_order,winning_number,drawn_at'),
      ])
    : await Promise.all([
        supabase.from('eventos').select('*'),
        supabase.from('produtos').select('*'),
        supabase.from('produto_variacoes').select('*'),
        supabase.from('produto_variacao_opcoes').select('*'),
        supabase.from('rifas').select('*'),
        supabase.from('rifa_premios').select('*'),
      ])
  const error = results.find((result) => result.error)?.error
  if (error) throw error
  return {
    events: results[0].data as unknown as EventRow[],
    products: results[1].data as unknown as ProductRow[],
    variations: results[2].data as unknown as VariationRow[],
    options: results[3].data as unknown as OptionRow[],
    raffles: results[4].data as unknown as RaffleRow[],
    prizes: results[5].data as unknown as PrizeRow[],
  }
}

function composeEventRelationRows(rows: EventRelationRows, preferDraftPayload = true) {
  return composeEvents(
    rows.events,
    rows.products,
    rows.variations,
    rows.options,
    rows.raffles,
    rows.prizes,
    preferDraftPayload,
  )
}

async function loadEventRelations(publicOnly: boolean) {
  const events = composeEventRelationRows(await loadEventRelationRows(publicOnly))
  return publicOnly ? events : events.sort((a, b) => {
    if (a.status === 'draft' && b.status !== 'draft') return -1
    if (a.status !== 'draft' && b.status === 'draft') return 1
    return a.title.localeCompare(b.title, 'pt-BR')
  })
}

async function resolvePhotos(prefix: string, photos: EditablePhoto[]) {
  const uploaded = await uploadNewPhotos(prefix, photos)
  return {
    paths: photos.map((photo) => required(photo.path ?? uploaded.get(photo.key), 'Imagem não preparada.')),
    uploaded: [...uploaded.values()],
  }
}

function eventPhotoPaths(event: FundraisingEvent | undefined) {
  return event ? [
    ...event.gallery,
    ...event.prizes.map((prize) => prize.image),
    ...event.products.flatMap((product) => [
      ...product.gallery,
      ...(product.measurementGuide?.kind === 'image' ? [product.measurementGuide.path] : []),
    ]),
  ] : []
}

async function prepareStoredDraft(
  id: string,
  draft: EventDraft,
  uploadedPaths: string[],
  retainedPaths: Set<string>,
): Promise<FundraisingEvent> {
  const eventPhotos = await resolvePhotos(`eventos/${id}`, draft.gallery)
  uploadedPaths.push(...eventPhotos.uploaded)
  eventPhotos.paths.forEach((path) => retainedPaths.add(path))

  const products: EventProduct[] = []
  for (const product of draft.products) {
    const photos = await resolvePhotos(`eventos/${id}/produtos/${product.id}`, product.gallery)
    uploadedPaths.push(...photos.uploaded)
    photos.paths.forEach((path) => retainedPaths.add(path))
    let measurementGuide: ProductMeasurementGuide | undefined
    if (product.measurementGuide?.kind === 'image') {
      const image = await resolvePhotos(
        `eventos/${id}/produtos/${product.id}/medidas`,
        [product.measurementGuide.photo],
      )
      uploadedPaths.push(...image.uploaded)
      retainedPaths.add(image.paths[0])
      measurementGuide = { kind: 'image', path: image.paths[0] }
    } else if (product.measurementGuide?.kind === 'table') {
      measurementGuide = product.measurementGuide
    }
    products.push({
      ...product,
      gallery: photos.paths,
      measurementGuide,
    })
  }

  const prizes: RafflePrize[] = []
  for (const prize of draft.prizes) {
    const image = await resolvePhotos(`eventos/${id}/premios/${prize.id}`, [prize.image])
    uploadedPaths.push(...image.uploaded)
    retainedPaths.add(image.paths[0])
    prizes.push({ ...prize, image: image.paths[0] })
  }

  return {
    audit: null,
    id,
    status: 'draft',
    kind: draft.kind,
    title: draft.title,
    description: draft.description,
    startDate: draft.startDate,
    endDate: draft.endDate,
    fundraisingGoal: draft.fundraisingGoal,
    maxItemsPerReservation: draft.maxItemsPerReservation,
    reservationTtlMinutes: draft.reservationTtlMinutes,
    gallery: eventPhotos.paths,
    products,
    raffleTotalNumbers: draft.raffleTotalNumbers,
    raffleNumberPrice: draft.raffleNumberPrice,
    prizes,
    paymentKey: draft.paymentKey,
    paymentReceiver: draft.paymentReceiver,
    city: draft.city,
    postPaymentInstructions: draft.postPaymentInstructions,
    receiptFolderUrl: draft.receiptFolderUrl,
  }
}

async function saveEventDraft(draft: EventDraft) {
  const id = draft.id ?? crypto.randomUUID()
  const oldRows = draft.id ? await loadEventRelationRows(false) : undefined
  const oldEvent = oldRows?.events.some((row) => row.id === id)
    ? composeEventRelationRows(oldRows).find((event) => event.id === id)
    : undefined
  const oldPersistedEvent = oldRows?.events.some((row) => row.id === id)
    ? composeEventRelationRows(oldRows, false).find((event) => event.id === id)
    : undefined
  const uploadedPaths: string[] = []
  const retainedPaths = new Set<string>()

  try {
    const storedDraft = await prepareStoredDraft(id, draft, uploadedPaths, retainedPaths)
    const goal = parseCurrencyToCents(draft.fundraisingGoal)
    const name = draft.title.trim()
    const description = draft.description.trim()
    const maximum = Number(draft.maxItemsPerReservation)
    const endDate = !draft.startDate || !draft.endDate || draft.startDate <= draft.endDate ? draft.endDate || null : null
    const values: TablesInsert<'eventos'> = {
      id,
      name: name.length >= 1 && name.length <= 80 ? name : null,
      description: description.length >= 1 && description.length <= 2000 ? description : null,
      type: EVENT_KIND_TO_DB[draft.kind],
      status: 'rascunho',
      photos: storedDraft.gallery,
      start_date: draft.startDate || null,
      end_date: endDate,
      fundraising_goal_cents: Number.isSafeInteger(goal) && goal > 0 ? goal : null,
      max_items_per_reservation: isPositiveInteger(draft.maxItemsPerReservation) && maximum <= 2_147_483_647 ? maximum : null,
      reservation_ttl: minutesToInterval(draft.reservationTtlMinutes),
      pix_key: draft.paymentKey.trim() || null,
      pix_receiver: draft.paymentReceiver.trim() || null,
      pix_city: draft.city.trim() || null,
      post_payment_instructions: draft.postPaymentInstructions.trim() || null,
      receipt_folder_url: /^https:\/\//i.test(draft.receiptFolderUrl.trim()) ? draft.receiptFolderUrl.trim() : null,
      data_verified_at: null,
      draft_payload: storedDraft as unknown as Json,
    }
    const { error } = await supabase.from('eventos').upsert(values)
    if (error) throw error

    const previousPaths = new Set([
      ...eventPhotoPaths(oldEvent),
      ...eventPhotoPaths(oldPersistedEvent),
    ])
    await removeStoredPhotos([...previousPaths].filter((path) => !retainedPaths.has(path)))
    return (await loadEventRelations(false)).find((event) => event.id === id)
  } catch (error) {
    await removeStoredPhotos(uploadedPaths).catch(() => undefined)
    throw error
  }
}

async function saveEvent(draft: EventDraft) {
  const id = draft.id ?? crypto.randomUUID()
  const oldRows = draft.id ? await loadEventRelationRows(false) : undefined
  const oldEvent = oldRows ? composeEventRelationRows(oldRows).find((event) => event.id === id) : undefined
  const oldPersistedEvent = oldRows ? composeEventRelationRows(oldRows, false).find((event) => event.id === id) : undefined
  const uploadedPaths: string[] = []
  const retainedPaths = new Set<string>()

  try {
    const eventPhotos = await resolvePhotos(`eventos/${id}`, draft.gallery)
    uploadedPaths.push(...eventPhotos.uploaded)
    eventPhotos.paths.forEach((path) => retainedPaths.add(path))

    const values: TablesInsert<'eventos'> = {
      id,
      name: draft.title.trim(),
      description: draft.description.trim(),
      type: EVENT_KIND_TO_DB[draft.kind],
      status: draft.status ? EVENT_STATUS_TO_DB[draft.status] : 'rascunho',
      photos: eventPhotos.paths,
      start_date: draft.startDate,
      end_date: draft.endDate,
      fundraising_goal_cents: parseCurrencyToCents(draft.fundraisingGoal),
      max_items_per_reservation: Number(draft.maxItemsPerReservation) || null,
      reservation_ttl: minutesToInterval(draft.reservationTtlMinutes),
      pix_key: draft.paymentKey.trim() || null,
      pix_receiver: draft.paymentReceiver.trim() || null,
      pix_city: draft.city.trim() || null,
      post_payment_instructions: draft.postPaymentInstructions.trim(),
      receipt_folder_url: draft.receiptFolderUrl.trim() || null,
      data_verified_at: new Date().toISOString(),
      draft_payload: null,
    }
    const eventRequest = draft.id
      ? supabase.from('eventos').update(values).eq('id', id)
      : supabase.from('eventos').insert(values)
    const { error: eventError } = await eventRequest
    if (eventError) throw eventError

    if (draft.kind === 'raffle') {
      const { error: productDeleteError } = await supabase.from('produtos').delete().eq('event_id', id)
      if (productDeleteError) throw productDeleteError
      const { error: raffleError } = await supabase.from('rifas').upsert({
        event_id: id,
        total_numbers: Number(draft.raffleTotalNumbers),
        number_price_cents: parseCurrencyToCents(draft.raffleNumberPrice),
      })
      if (raffleError) throw raffleError

      const prizeIds = draft.prizes.map((prize) => prize.id)
      const oldPrizeIds = oldPersistedEvent?.prizes.map((prize) => prize.id) ?? []
      const removedPrizeIds = oldPrizeIds.filter((prizeId) => !prizeIds.includes(prizeId))
      if (removedPrizeIds.length) {
        const { error } = await supabase.from('rifa_premios').delete().in('id', removedPrizeIds)
        if (error) throw error
      }
      for (const [index, prize] of (oldPersistedEvent?.prizes ?? []).entries()) {
        const { error } = await supabase.from('rifa_premios').update({ display_order: 30000 + index }).eq('id', prize.id)
        if (error) throw error
      }
      for (const [index, prize] of draft.prizes.entries()) {
        const image = await resolvePhotos(`eventos/${id}/premios/${prize.id}`, [prize.image])
        uploadedPaths.push(...image.uploaded)
        image.paths.forEach((path) => retainedPaths.add(path))
        const { error } = await supabase.from('rifa_premios').upsert({
          id: prize.id,
          event_id: id,
          name: prize.name.trim(),
          photo: image.paths[0],
          display_order: index + 1,
          winning_number: prize.winningNumber ?? null,
          winner_name: prize.winnerName ?? null,
          drawn_at: prize.drawnAt ?? null,
        })
        if (error) throw error
      }
    } else {
      const { error: raffleDeleteError } = await supabase.from('rifas').delete().eq('event_id', id)
      if (raffleDeleteError) throw raffleDeleteError
      const productIds = draft.products.map((product) => product.id)
      const oldProductIds = oldPersistedEvent?.products.map((product) => product.id) ?? []
      const removedProductIds = oldProductIds.filter((productId) => !productIds.includes(productId))
      if (removedProductIds.length) {
        const { error } = await supabase.from('produtos').delete().in('id', removedProductIds)
        if (error) throw error
      }
      for (const [index, product] of (oldPersistedEvent?.products ?? []).entries()) {
        const { error } = await supabase.from('produtos').update({ display_order: 30000 + index }).eq('id', product.id)
        if (error) throw error
      }

      for (const [productIndex, product] of draft.products.entries()) {
        const photos = await resolvePhotos(`eventos/${id}/produtos/${product.id}`, product.gallery)
        uploadedPaths.push(...photos.uploaded)
        photos.paths.forEach((path) => retainedPaths.add(path))
        let measurementImage: string | null = null
        let measurementTable: Json | null = null
        if (product.measurementGuide?.kind === 'image') {
          const image = await resolvePhotos(
            `eventos/${id}/produtos/${product.id}/medidas`,
            [product.measurementGuide.photo],
          )
          uploadedPaths.push(...image.uploaded)
          measurementImage = image.paths[0]
          retainedPaths.add(measurementImage)
        } else if (product.measurementGuide?.kind === 'table') {
          measurementTable = product.measurementGuide.table as unknown as Json
        }
        const { error: productError } = await supabase.from('produtos').upsert({
          id: product.id,
          event_id: id,
          name: product.name.trim(),
          description: product.description.trim(),
          photos: photos.paths,
          unit_price_cents: parseCurrencyToCents(product.price),
          discount_min_quantity: Number(product.discountMinimum) || null,
          discount_unit_price_cents: parseCurrencyToCents(product.discountPrice) || null,
          measurement_image: measurementImage,
          measurement_table: measurementTable,
          display_order: productIndex + 1,
        })
        if (productError) throw productError

        const variationIds = product.variations.map((variation) => variation.id)
        const oldVariations = oldPersistedEvent?.products.find((item) => item.id === product.id)?.variations ?? []
        const removedVariationIds = oldVariations.map((item) => item.id).filter((item) => !variationIds.includes(item))
        if (removedVariationIds.length) {
          const { error } = await supabase.from('produto_variacoes').delete().in('id', removedVariationIds)
          if (error) throw error
        }
        for (const [index, variation] of oldVariations.entries()) {
          const { error } = await supabase.from('produto_variacoes').update({ display_order: 30000 + index }).eq('id', variation.id)
          if (error) throw error
        }
        for (const [variationIndex, variation] of product.variations.entries()) {
          const { error: variationError } = await supabase.from('produto_variacoes').upsert({
            id: variation.id,
            product_id: product.id,
            name: variation.name.trim(),
            display_order: variationIndex + 1,
          })
          if (variationError) throw variationError
          const optionIds = variation.options.map((option) => option.id)
          const oldOptions = oldVariations.find((item) => item.id === variation.id)?.options ?? []
          const removedOptionIds = oldOptions.map((item) => item.id).filter((item) => !optionIds.includes(item))
          if (removedOptionIds.length) {
            const { error } = await supabase.from('produto_variacao_opcoes').delete().in('id', removedOptionIds)
            if (error) throw error
          }
          for (const [index, option] of oldOptions.entries()) {
            const { error } = await supabase.from('produto_variacao_opcoes').update({ display_order: 30000 + index }).eq('id', option.id)
            if (error) throw error
          }
          const { error: optionsError } = await supabase.from('produto_variacao_opcoes').upsert(
            variation.options.map((option, optionIndex) => ({
              id: option.id,
              variation_id: variation.id,
              name: option.name.trim(),
              display_order: optionIndex + 1,
            })),
          )
          if (optionsError) throw optionsError
        }
      }
    }

    const previousPaths = new Set([
      ...eventPhotoPaths(oldEvent),
      ...eventPhotoPaths(oldPersistedEvent),
    ])
    await removeStoredPhotos([...previousPaths].filter((path) => !retainedPaths.has(path)))
    return (await loadEventRelations(false)).find((event) => event.id === id)
  } catch (error) {
    await removeStoredPhotos(uploadedPaths).catch(() => undefined)
    throw error
  }
}

async function updateEventStatus({ id, status }: { id: string; status: EventStatus }) {
  if (status === 'active') {
    await invokeEventFunction('activate-event', id)
    return
  }
  const { error } = await supabase.from('eventos').update({ status: EVENT_STATUS_TO_DB[status] }).eq('id', id)
  if (error) throw error
}

async function invokeEventFunction(name: 'activate-event' | 'delete-archived-event', eventId: string) {
  const { error } = await supabase.functions.invoke(name, { body: { eventId } })
  if (!error) return
  throw await parseAdminFunctionError(error)
}

async function deleteEvent({ event }: { event: FundraisingEvent }) {
  if (event.status === 'archived') {
    await invokeEventFunction('delete-archived-event', event.id)
  } else if (event.status === 'draft') {
    const { error } = await supabase.from('eventos').delete().eq('id', event.id)
    if (error) throw error
  } else {
    throw new Error('Encerre e oculte o evento antes de excluí-lo.')
  }
  await removeStoredPhotos([
    ...event.gallery,
    ...event.prizes.map((prize) => prize.image),
    ...event.products.flatMap((product) => [
      ...product.gallery,
      ...(product.measurementGuide?.kind === 'image' ? [product.measurementGuide.path] : []),
    ]),
  ])
}

async function listReservations(eventId: string) {
  const [reservationsResult, numbersResult, itemsResult, optionsResult] = await Promise.all([
    supabase.from('reservas').select('*').eq('event_id', eventId).order('created_at', { ascending: false }),
    supabase.from('reserva_numeros').select('*').eq('raffle_id', eventId),
    supabase.from('reserva_produtos').select('*'),
    supabase.from('reserva_produto_opcoes').select('*'),
  ])
  const error = reservationsResult.error ?? numbersResult.error ?? itemsResult.error ?? optionsResult.error
  if (error) throw error
  const reservationRows = reservationsResult.data ?? []
  const numberRows = numbersResult.data ?? []
  const itemRows = itemsResult.data ?? []
  const optionRows = optionsResult.data ?? []
  const reservationIds = new Set(reservationRows.map((row) => row.id))
  return reservationRows.map((row): EventReservation => ({
    audit: mapAuditMetadata(row),
    id: row.id,
    eventId: row.event_id,
    name: row.customer_name ?? 'Dados removidos',
    contact: row.customer_contact ?? '',
    status: RESERVATION_STATUS_FROM_DB[row.status],
    receiptSaved: row.receipt_saved,
    referenceCode: row.reference_code ?? '',
    totalCents: row.total_cents,
    expiresAt: row.expires_at,
    numbers: numberRows.filter((number) => number.reservation_id === row.id).map((number) => number.number).sort((a, b) => a - b),
    productItems: itemRows
      .filter((item) => reservationIds.has(item.reservation_id) && item.reservation_id === row.id)
      .map((item) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        unitPriceCents: item.unit_price_cents,
        options: Object.fromEntries(optionRows
          .filter((option) => option.reservation_product_id === item.id)
          .map((option) => [option.variation_id, {
            optionId: option.option_id,
            optionName: option.option_name,
            variationName: option.variation_name,
          }])),
      })),
  }))
}

async function getReservationSession() {
  const key = 'abrigo-event-reservation-session'
  const stored = sessionStorage.getItem(key)
  if (stored) return stored
  const { data, error } = await supabase.rpc('create_reservation_session')
  if (error) throw error
  sessionStorage.setItem(key, data)
  return data
}

function mapReservationResult(row: {
  expires_at: string
  pix_key: string | null
  pix_receiver: string | null
  pix_city: string | null
  post_payment_instructions: string
  reservation_id: string
  total_cents: number
}): ReservationResult {
  return {
    reservationId: row.reservation_id,
    totalCents: row.total_cents,
    expiresAt: row.expires_at,
    pixKey: row.pix_key ?? '',
    pixReceiver: row.pix_receiver ?? '',
    pixCity: row.pix_city ?? '',
    postPaymentInstructions: row.post_payment_instructions,
  }
}

async function reserveRaffle(input: { eventId: string; name: string; contact: string; numbers: number[] }) {
  const { data, error } = await supabase.rpc('reserve_raffle_numbers', {
    p_event_id: input.eventId,
    p_session_id: await getReservationSession(),
    p_customer_name: input.name,
    p_customer_contact: input.contact,
    p_numbers: input.numbers,
  })
  if (error) throw error
  return mapReservationResult(required(data[0], 'Reserva sem confirmação.'))
}

async function reserveProducts(input: {
  contact: string
  eventId: string
  items: { options: Record<string, string>; productId: string }[]
  name: string
}) {
  const { data, error } = await supabase.rpc('reserve_product_items', {
    p_event_id: input.eventId,
    p_session_id: await getReservationSession(),
    p_customer_name: input.name,
    p_customer_contact: input.contact,
    p_items: input.items as Json,
  })
  if (error) throw error
  return mapReservationResult(required(data[0], 'Reserva sem confirmação.'))
}

async function listRaffleNumbers(eventId: string) {
  const { data, error } = await supabase.from('rifa_numeros_public').select('*').eq('event_id', eventId).order('number')
  if (error) throw error
  return data.map((row) => ({
    number: required(row.number, 'Número de rifa inválido.'),
    available: row.available ?? false,
  }))
}

async function updateReservation(input: { id: string; receiptSaved?: boolean; status?: ReservationStatus } | EventReservationUpdate) {
  if ('name' in input) {
    const { error } = await supabase.rpc('update_event_reservation', {
      p_reservation_id: input.id,
      p_customer_name: input.name,
      p_customer_contact: input.contact,
      p_status: RESERVATION_STATUS_TO_DB[input.status],
      p_receipt_saved: input.receiptSaved,
      p_numbers: input.numbers,
      p_items: input.productItems as Json,
    })
    if (error) throw error
    return
  }
  const values: { receipt_saved?: boolean; status?: Tables<'reservas'>['status'] } = {}
  if (input.receiptSaved !== undefined) values.receipt_saved = input.receiptSaved
  if (input.status) values.status = RESERVATION_STATUS_TO_DB[input.status]
  const { error } = await supabase.from('reservas').update(values).eq('id', input.id)
  if (error) throw error
}

async function drawPrize(prizeId: string) {
  const { data, error } = await supabase.rpc('draw_raffle_prize', { p_prize_id: prizeId })
  if (error) throw error
  return required(data[0], 'Sorteio sem resultado.')
}

async function loadEventSettings(): Promise<EventSettings> {
  const { data, error } = await supabase.from('event_settings').select('*').eq('singleton', true).single()
  if (error) throw error
  return {
    audit: mapAuditMetadata(data),
    defaultMaxProductUnits: data.default_max_product_units,
    defaultMaxRaffleNumbers: data.default_max_raffle_numbers,
    defaultPostPaymentInstructions: data.default_post_payment_instructions ?? '',
    defaultReservationTtlMinutes: Number(intervalToMinutes(data.default_reservation_ttl)),
    eventExportEmail: data.event_export_email ?? '',
  }
}

async function saveEventSettings(settings: EventSettings) {
  const { error } = await supabase.from('event_settings').update({
    default_max_product_units: settings.defaultMaxProductUnits,
    default_max_raffle_numbers: settings.defaultMaxRaffleNumbers,
    default_post_payment_instructions: settings.defaultPostPaymentInstructions.trim() || null,
    default_reservation_ttl: `${settings.defaultReservationTtlMinutes} minutes`,
    event_export_email: settings.eventExportEmail.trim() || null,
  }).eq('singleton', true)
  if (error) throw error
}

function invalidateEvents(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: adminEventsKey }),
    queryClient.invalidateQueries({ queryKey: publicEventsKey }),
  ])
}

export function useAdminEvents() {
  return useQuery({ queryKey: adminEventsKey, queryFn: () => loadEventRelations(false) })
}

export function usePublicEvents() {
  return useQuery({
    queryKey: publicEventsKey,
    queryFn: () => loadEventRelations(true),
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useSaveEvent() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: saveEvent, onSuccess: () => invalidateEvents(queryClient) })
}

export function useSaveEventDraft() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: saveEventDraft, onSuccess: () => invalidateEvents(queryClient) })
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: updateEventStatus, onSuccess: () => invalidateEvents(queryClient) })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: deleteEvent, onSuccess: () => invalidateEvents(queryClient) })
}

export function useEventReservations(eventId: string) {
  return useQuery({
    queryKey: reservationsKey(eventId),
    queryFn: () => listReservations(eventId),
    enabled: Boolean(eventId),
    refetchInterval: 5_000,
  })
}

export function useUpdateEventReservation(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateReservation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationsKey(eventId) }),
  })
}

export function useRaffleNumbers(eventId: string, enabled = true) {
  return useQuery({
    queryKey: raffleNumbersKey(eventId),
    queryFn: () => listRaffleNumbers(eventId),
    enabled: enabled && Boolean(eventId),
    refetchInterval: 5_000,
  })
}

export function useReserveRaffle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reserveRaffle,
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: raffleNumbersKey(variables.eventId) }),
  })
}

export function useReserveProducts() {
  return useMutation({ mutationFn: reserveProducts })
}

export function useDrawRafflePrize(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: drawPrize,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: adminEventsKey }),
      queryClient.invalidateQueries({ queryKey: publicEventsKey }),
      queryClient.invalidateQueries({ queryKey: reservationsKey(eventId) }),
    ]),
  })
}

export function useEventSettings() {
  return useQuery({ queryKey: eventSettingsKey, queryFn: loadEventSettings })
}

export function useSaveEventSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveEventSettings,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: eventSettingsKey }),
      invalidateEvents(queryClient),
    ]),
  })
}

export function getEventPhotoUrl(path: string) {
  return getStoredPhotoUrl(path)
}

export function toEditableEventPhotos(event: FundraisingEvent | null) {
  return toEditablePhotos(event?.gallery ?? [])
}

export function toEditableEventDraft(event: FundraisingEvent): EventDraft {
  return {
    ...event,
    gallery: toEditableEventPhotos(event),
    prizes: toEditableRafflePrizes(event),
    products: event.products.map(toEditableProduct),
  }
}

export function toEditableProduct(product: EventProduct): EditableEventProduct {
  return {
    ...product,
    gallery: toEditablePhotos(product.gallery),
    measurementGuide: product.measurementGuide?.kind === 'image'
      ? { kind: 'image', photo: toEditablePhotos([product.measurementGuide.path])[0] }
      : product.measurementGuide,
  }
}

export function toEditableRafflePrizes(event: FundraisingEvent | null): EditableRafflePrize[] {
  return (event?.prizes ?? []).map((prize) => ({
    ...prize,
    image: toEditablePhotos([prize.image])[0],
  }))
}
