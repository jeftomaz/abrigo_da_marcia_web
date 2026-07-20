import type { EditablePhoto } from '@abrigo/shared'
import productImage from '../../../public/src/assets/evento_camiseta.jpg'
import raffleImage from '../../../public/src/assets/evento_rifa.jpg'

export type EventKind = 'product' | 'raffle'
export type EventStatus = 'draft' | 'active' | 'ended'

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
  raffleNumberPrice: string
  raffleTotalNumbers: string
  receiptFolderUrl: string
  startDate: string
  status: EventStatus
  title: string
  variationName: string
  variationOptions: string
}

export type EventDraft = Omit<FundraisingEvent, 'gallery' | 'id' | 'status'> & {
  gallery: EditablePhoto[]
  id?: string
  status?: EventStatus
}

export const TEMPORARY_EVENTS: FundraisingEvent[] = [
  {
    id: 'event-1',
    kind: 'product',
    status: 'active',
    title: 'Camiseta da Copa',
    description: 'Camiseta especial do Abrigo para celebrar a Copa e ajudar nossos cães.',
    startDate: '2026-07-19',
    endDate: '2026-08-31',
    fundraisingGoal: '10000',
    maxItemsPerReservation: '5',
    gallery: [productImage],
    productPrice: '59,90',
    productDiscountPrice: '54,90',
    productDiscountMinimum: '3',
    variationName: 'Tamanho',
    variationOptions: 'P, M, G, GG',
    raffleTotalNumbers: '',
    raffleNumberPrice: '',
    prize: '',
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
    variationName: 'Cor',
    variationOptions: 'Branca, Vermelha',
    raffleTotalNumbers: '',
    raffleNumberPrice: '',
    prize: '',
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
    title: 'Rifa da Copa',
    description: 'Rifa beneficente com um kit especial para os torcedores.',
    startDate: '2026-05-15',
    endDate: '2026-06-15',
    fundraisingGoal: '10000',
    maxItemsPerReservation: '10',
    gallery: [raffleImage],
    productPrice: '',
    productDiscountPrice: '',
    productDiscountMinimum: '',
    variationName: '',
    variationOptions: '',
    raffleTotalNumbers: '1000',
    raffleNumberPrice: '10,00',
    prize: 'Kit Chopp dia de jogo',
    paymentKey: 'abrigodamarcia@gmail.com',
    city: 'Ribeirão Preto',
    paymentReceiver: 'Márcia Câmara Barbosa',
    pixCode: '',
    postPaymentInstructions: 'Envie o comprovante pelo WhatsApp do Abrigo.',
    receiptFolderUrl: '',
  },
]

export function toEditableEventPhotos(event: FundraisingEvent | null): EditablePhoto[] {
  return (event?.gallery ?? []).map((previewUrl, index) => ({
    key: `${event?.id ?? 'event'}-${index}`,
    previewUrl,
  }))
}
