import { useMemo, useState } from 'react'
import {
  Action,
  Dialog,
  TextField,
  formatBrazilPhoneInput,
  getAdminErrorMessage,
  getReservationContactError,
  getReservationNameError,
  normalizeReservationContact,
} from '@abrigo/shared'
import type { ReservationContactType } from '@abrigo/shared'
import type {
  EventProduct,
  EventReservation,
  EventReservationUpdate,
  FundraisingEvent,
  ReservationStatus,
} from '../events/events'

type ProductItemDraft = {
  key: string
  options: Record<string, string>
  productId: string
}

type EditableReservationContactType = Exclude<ReservationContactType, 'mobile'>

type ReservationEditDialogProps = {
  event: FundraisingEvent
  onClose: () => void
  onSave: (update: EventReservationUpdate) => Promise<void>
  reservation: EventReservation
  reservations: EventReservation[]
}

function createProductItem(product: EventProduct, options: Record<string, string> = {}): ProductItemDraft {
  return {
    key: crypto.randomUUID(),
    productId: product.id,
    options: Object.fromEntries(product.variations.map((variation) => [
      variation.id,
      variation.options.some((option) => option.id === options[variation.id])
        ? options[variation.id]
        : variation.options[0]?.id ?? '',
    ])),
  }
}

export function ReservationEditDialog({
  event,
  onClose,
  onSave,
  reservation,
  reservations,
}: ReservationEditDialogProps) {
  const initialContactType: EditableReservationContactType = reservation.contact.includes('@') ? 'email' : 'phone'
  const [name, setName] = useState(reservation.name)
  const [contactType, setContactType] = useState(initialContactType)
  const [contact, setContact] = useState(
    initialContactType === 'phone' ? formatBrazilPhoneInput(reservation.contact) : reservation.contact,
  )
  const [status, setStatus] = useState(reservation.status)
  const [receiptSaved, setReceiptSaved] = useState(reservation.receiptSaved)
  const [numbers, setNumbers] = useState(reservation.numbers)
  const [productItems, setProductItems] = useState<ProductItemDraft[]>(() => reservation.productItems.map((item) => {
    const product = event.products.find((candidate) => candidate.id === item.productId)
    const savedOptions = Object.fromEntries(
      Object.entries(item.options).map(([variationId, option]) => [variationId, option.optionId]),
    )
    return product
      ? createProductItem(product, savedOptions)
      : { key: crypto.randomUUID(), productId: '', options: savedOptions }
  }))
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const occupiedNumbers = useMemo(() => new Set(
    reservations
      .filter((candidate) => candidate.id !== reservation.id && candidate.status !== 'canceled')
      .flatMap((candidate) => candidate.numbers),
  ), [reservation.id, reservations])
  const isTerminal = reservation.status === 'canceled' || reservation.status === 'delivered'

  const replaceProduct = (index: number, productId: string) => {
    const product = event.products.find((candidate) => candidate.id === productId)
    if (!product) return
    setProductItems((current) => current.map((item, itemIndex) => itemIndex === index
      ? { ...createProductItem(product), key: item.key }
      : item))
  }

  const submit = async () => {
    const normalizedName = name.trim()
    const nameError = getReservationNameError(normalizedName)
    if (nameError) return setError(nameError)
    const contactError = getReservationContactError(contactType, contact)
    if (contactError) return setError(contactError)
    if (event.kind === 'raffle' && numbers.length === 0) return setError('Selecione ao menos um número.')
    if (event.kind === 'product' && productItems.length === 0) return setError('Adicione ao menos um item.')
    if (event.kind === 'product' && productItems.some((item) => !item.productId)) {
      return setError('Escolha um produto atual para substituir o item removido do catálogo.')
    }
    if (event.kind === 'product' && productItems.some((item) => Object.values(item.options).some((option) => !option))) {
      return setError('Escolha uma opção de cada variação.')
    }

    setError('')
    setIsSaving(true)
    try {
      await onSave({
        id: reservation.id,
        name: normalizedName,
        contact: normalizeReservationContact(contactType, contact),
        status,
        receiptSaved,
        numbers: [...numbers].sort((a, b) => a - b),
        productItems: productItems.map(({ options, productId }) => ({ options, productId })),
      })
      onClose()
    } catch (saveError) {
      setError(getAdminErrorMessage(saveError, 'Não foi possível salvar a reserva.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog ariaLabel="Editar reserva" onClose={isSaving ? () => undefined : onClose} persistentClose className="w-full max-w-3xl rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-8">
      <h2 className="pr-24 text-3xl font-medium text-marca">Editar reserva</h2>
      <p className="mt-1 text-sm text-cinza-medio dark:text-cinza-claro">Altere os dados do cliente e os itens da reserva.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="font-medium">
          Nome do cliente
          <TextField value={name} onChange={(changeEvent) => setName(changeEvent.target.value)} disabled={isSaving || isTerminal} maxLength={120} className="mt-1 px-3 py-2 font-normal" />
        </label>
        <div>
          <span className="font-medium">Contato</span>
          <div className="mt-1 grid grid-cols-[7rem_minmax(0,1fr)] gap-2">
            <TextField as="select" value={contactType} onChange={(changeEvent) => { setContactType(changeEvent.target.value as EditableReservationContactType); setContact('') }} disabled={isSaving || isTerminal} className="px-2 py-2">
              <option value="phone">Telefone</option>
              <option value="email">E-mail</option>
            </TextField>
            <TextField value={contact} onChange={(changeEvent) => setContact(contactType === 'phone' ? formatBrazilPhoneInput(changeEvent.target.value) : changeEvent.target.value)} disabled={isSaving || isTerminal} inputMode={contactType === 'phone' ? 'tel' : 'email'} className="px-3 py-2" />
          </div>
        </div>
        <label className="font-medium">
          Status
          <TextField as="select" value={status} onChange={(changeEvent) => setStatus(changeEvent.target.value as ReservationStatus)} disabled={isSaving || isTerminal} className="mt-1 px-3 py-2 font-normal">
            <option value={reservation.status}>{reservation.status === 'reserved' ? 'Reservado' : reservation.status === 'paid' ? 'Pago' : reservation.status === 'delivered' ? 'Entregue' : 'Cancelado'}</option>
            {reservation.status === 'reserved' && <><option value="paid">Pago</option><option value="canceled">Cancelado</option></>}
            {reservation.status === 'paid' && <><option value="reserved">Reservado</option><option value="canceled">Cancelado</option>{event.status !== 'active' && <option value="delivered">Entregue</option>}</>}
          </TextField>
        </label>
        <label className="flex items-end gap-2 pb-3 font-medium">
          <input type="checkbox" checked={receiptSaved} onChange={(changeEvent) => setReceiptSaved(changeEvent.target.checked)} disabled={isSaving || isTerminal} className="size-5 accent-marca" />
          Comprovante salvo
        </label>
      </div>

      <section className="mt-6 border-t border-cinza-medio pt-5 dark:border-cinza-claro">
        <h3 className="text-xl font-medium">{event.kind === 'raffle' ? 'Números da rifa' : 'Itens da reserva'}</h3>
        {event.kind === 'raffle' ? (
          <div className="mt-3 grid max-h-64 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-10">
            {Array.from({ length: Number(event.raffleTotalNumbers) }, (_, index) => index + 1).map((number) => {
              const selected = numbers.includes(number)
              const occupied = occupiedNumbers.has(number)
              return (
                <button key={number} type="button" disabled={isSaving || isTerminal || occupied} aria-pressed={selected} title={occupied ? 'Número em outra reserva' : undefined} onClick={() => setNumbers((current) => selected ? current.filter((item) => item !== number) : [...current, number])} className="min-h-10 rounded-lg bg-cinza-claro px-1 text-sm text-cinza-escuro outline-none aria-pressed:bg-marca aria-pressed:text-on-brand focus-visible:ring-2 focus-visible:ring-marca disabled:cursor-not-allowed disabled:opacity-30 dark:bg-cinza-medio dark:text-cinza-claro dark:aria-pressed:bg-marca">
                  {String(number).padStart(2, '0')}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {productItems.map((item, index) => {
              const product = event.products.find((candidate) => candidate.id === item.productId)
              return (
                <div key={item.key} className="rounded-2xl bg-cinza-claro p-3 text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
                  <div className="flex items-center gap-2">
                    <TextField as="select" value={item.productId} onChange={(changeEvent) => replaceProduct(index, changeEvent.target.value)} disabled={isSaving || isTerminal} className="min-w-0 flex-1 bg-surface-raised px-3 py-2 text-on-surface-raised">
                      {!item.productId && <option value="">Produto removido — escolha outro</option>}
                      {event.products.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
                    </TextField>
                    <Action onClick={() => setProductItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} disabled={isSaving || isTerminal} icon="trash-solid" size="small" variant="neutral-adaptive" aria-label={`Remover item ${index + 1}`} className="shrink-0 px-3">Remover</Action>
                  </div>
                  {product?.variations.map((variation) => (
                    <label key={variation.id} className="mt-3 block text-sm font-medium">
                      {variation.name}
                      <TextField as="select" value={item.options[variation.id] ?? ''} onChange={(changeEvent) => setProductItems((current) => current.map((candidate, itemIndex) => itemIndex === index ? { ...candidate, options: { ...candidate.options, [variation.id]: changeEvent.target.value } } : candidate))} disabled={isSaving || isTerminal} className="mt-1 bg-surface-raised px-3 py-2 text-on-surface-raised">
                        {variation.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                      </TextField>
                    </label>
                  ))}
                </div>
              )
            })}
            <Action onClick={() => event.products[0] && setProductItems((current) => [...current, createProductItem(event.products[0])])} disabled={isSaving || isTerminal || event.products.length === 0} icon="keyframe-plus-in-solid" size="small" variant="neutral-adaptive" className="self-start px-4">Adicionar item</Action>
          </div>
        )}
      </section>

      {isTerminal && <p role="alert" className="mt-5 text-sm font-medium text-marca">Reservas canceladas ou entregues são somente leitura.</p>}
      {error && <p role="alert" className="mt-5 text-sm font-medium text-marca">{error}</p>}
      <div className="mt-7 flex gap-3">
        <Action onClick={onClose} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28">Cancelar</Action>
        <Action onClick={() => void submit()} disabled={isSaving || isTerminal} icon="check-circle-solid" size="small" variant="primary-adaptive" className="min-w-0 flex-1">{isSaving ? 'Salvando...' : 'Salvar reserva'}</Action>
      </div>
    </Dialog>
  )
}
