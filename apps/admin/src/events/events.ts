import type { EditablePhoto } from '@abrigo/shared'
import productImage from '../../../public/src/assets/evento_camiseta.jpg'
import raffleImage from '../../../public/src/assets/evento_rifa.jpg'

export type EventKind = 'product' | 'raffle'
export type EventStatus = 'active' | 'archived' | 'draft' | 'ended'
export type ReservationStatus = 'canceled' | 'delivered' | 'paid' | 'reserved'

export type ProductVariation = {
  id: string
  name: string
  options: string[]
}

export type FundraisingEvent = {
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
  pixCode: string
  postPaymentInstructions: string
  productDiscountMinimum: string
  productDiscountPrice: string
  productPrice: string
  prize: string
  prizeImage: string
  raffleNumberPrice: string
  raffleTotalNumbers: string
  receiptFolderUrl: string
  startDate: string
  status: EventStatus
  title: string
  variations: ProductVariation[]
}

export type EventDraft = Omit<FundraisingEvent, 'gallery' | 'id' | 'prizeImage' | 'status'> & {
  gallery: EditablePhoto[]
  id?: string
  prizeImage: EditablePhoto | null
  status?: EventStatus
}

export type EventReservation = {
  contact: string
  eventId: string
  id: string
  name: string
  numbers: number[]
  productOptions: Record<string, string>
  productQuantity: number
  receiptSaved: boolean
  status: ReservationStatus
}

export type ReservationDraft = Omit<EventReservation, 'eventId' | 'id' | 'receiptSaved' | 'status'> & {
  id?: string
}

export const TEMPORARY_EVENTS: FundraisingEvent[] = [
  {
    id: 'event-1',
    kind: 'raffle',
    status: 'active',
    title: 'Rifa da Copa',
    description: 'Rifa beneficente com um kit especial para os torcedores.',
    startDate: '2026-06-16',
    endDate: '2026-06-30',
    fundraisingGoal: '1000',
    maxItemsPerReservation: '10',
    gallery: [raffleImage],
    productPrice: '',
    productDiscountPrice: '',
    productDiscountMinimum: '',
    variations: [],
    raffleTotalNumbers: '100',
    raffleNumberPrice: '10,00',
    prize: 'Kit Chopp dia de jogo',
    prizeImage: raffleImage,
    paymentKey: 'abrigodamarcia@gmail.com',
    city: 'Ribeirão Preto',
    paymentReceiver: 'Márcia Câmara Barbosa',
    pixCode: '',
    postPaymentInstructions: 'Envie o comprovante pelo WhatsApp do Abrigo.',
    receiptFolderUrl: '',
  },
  {
    id: 'event-2',
    kind: 'product',
    status: 'draft',
    title: 'Caneca de Natal',
    description: 'Caneca temática de Natal para apoiar o Abrigo.',
    startDate: '2026-11-01',
    endDate: '2026-12-20',
    fundraisingGoal: '5000',
    maxItemsPerReservation: '5',
    gallery: [productImage],
    productPrice: '39,90',
    productDiscountPrice: '',
    productDiscountMinimum: '',
    variations: [{ id: 'event-2-color', name: 'Cor', options: ['Branca', 'Vermelha'] }],
    raffleTotalNumbers: '',
    raffleNumberPrice: '',
    prize: '',
    prizeImage: '',
    paymentKey: 'abrigodamarcia@gmail.com',
    city: 'Ribeirão Preto',
    paymentReceiver: 'Márcia Câmara Barbosa',
    pixCode: '',
    postPaymentInstructions: '',
    receiptFolderUrl: '',
  },
  {
    id: 'event-3',
    kind: 'raffle',
    status: 'ended',
    title: 'Rifa Extra para Teste de Nomes Muito Longos',
    description: 'Rifa beneficente com um kit especial para os torcedores.',
    startDate: '2026-05-15',
    endDate: '2026-06-15',
    fundraisingGoal: '10000',
    maxItemsPerReservation: '10',
    gallery: [raffleImage],
    productPrice: '',
    productDiscountPrice: '',
    productDiscountMinimum: '',
    variations: [],
    raffleTotalNumbers: '1000',
    raffleNumberPrice: '10,00',
    prize: 'Kit Chopp dia de jogo',
    prizeImage: raffleImage,
    paymentKey: 'abrigodamarcia@gmail.com',
    city: 'Ribeirão Preto',
    paymentReceiver: 'Márcia Câmara Barbosa',
    pixCode: '',
    postPaymentInstructions: 'Envie o comprovante pelo WhatsApp do Abrigo.',
    receiptFolderUrl: '',
  },
]

export const TEMPORARY_RESERVATIONS: EventReservation[] = [
  {
    id: 'reservation-1',
    eventId: 'event-1',
    name: 'João da Silva Sauro',
    contact: '#5ga13c94',
    numbers: [14, 17, 22, 30, 31, 49, 65, 88, 93, 97],
    productQuantity: 0,
    productOptions: {},
    receiptSaved: false,
    status: 'reserved',
  },
  {
    id: 'reservation-2',
    eventId: 'event-1',
    name: 'Maria Joaquina Timelo',
    contact: '#4tn35c65',
    numbers: [5, 10, 11, 15, 23],
    productQuantity: 0,
    productOptions: {},
    receiptSaved: true,
    status: 'paid',
  },
  {
    id: 'reservation-3',
    eventId: 'event-1',
    name: 'João Paulo',
    contact: '(16) 99999-8888',
    numbers: [2, 28, 32],
    productQuantity: 0,
    productOptions: {},
    receiptSaved: false,
    status: 'paid',
  },
]

export function toEditableEventPhotos(event: FundraisingEvent | null): EditablePhoto[] {
  return (event?.gallery ?? []).map((previewUrl, index) => ({
    key: `${event?.id ?? 'event'}-${index}`,
    previewUrl,
  }))
}
