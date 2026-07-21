import { useId, useMemo, useState } from 'react'
import { Action, Icon } from '@abrigo/shared'
import type { FundraisingEvent, ReservationDraft, EventReservation } from '../events/events'

type ReservationFormProps = {
  event: FundraisingEvent
  onCancel: () => void
  onSave: (reservation: ReservationDraft) => void
  reservation: EventReservation | null
  unavailableNumbers: Set<number>
}

function numberValue(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

export function ReservationForm({
  event,
  onCancel,
  onSave,
  reservation,
  unavailableNumbers,
}: ReservationFormProps) {
  const formId = useId()
  const [name, setName] = useState(reservation?.name ?? '')
  const [contact, setContact] = useState(reservation?.contact ?? '')
  const [numbers, setNumbers] = useState(() => new Set(reservation?.numbers ?? []))
  const [productQuantity, setProductQuantity] = useState(reservation?.productQuantity || 1)
  const [productOptions, setProductOptions] = useState(reservation?.productOptions ?? {})
  const [showSelection, setShowSelection] = useState(false)
  const maxItems = Number(event.maxItemsPerReservation) || Number.POSITIVE_INFINITY
  const raffleNumbers = useMemo(
    () => Array.from({ length: Number(event.raffleTotalNumbers) || 0 }, (_, index) => index + 1),
    [event.raffleTotalNumbers],
  )
  const variations = event.variations.filter(
    (variation) => variation.name && variation.options.length > 0,
  )
  const selectedNumbers = [...numbers].sort((a, b) => a - b)
  const itemCount = event.kind === 'raffle' ? numbers.size : productQuantity
  const total =
    event.kind === 'raffle'
      ? numbers.size * numberValue(event.raffleNumberPrice)
      : productQuantity * numberValue(event.productPrice)
  const hasRequiredOption = event.kind === 'raffle' || variations.every(
    (variation) => productOptions[variation.name],
  )
  const canSubmit = Boolean(name.trim() && hasRequiredOption && itemCount > 0 && itemCount <= maxItems)
  const fieldClasses =
    'mt-2 h-12 w-full rounded-xl border-2 border-cinza-medio bg-transparent px-4 text-lg outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50'

  const toggleNumber = (number: number) => {
    if (unavailableNumbers.has(number)) return
    setNumbers((current) => {
      const next = new Set(current)
      if (next.has(number)) next.delete(number)
      else if (next.size < maxItems) next.add(number)
      return next
    })
  }

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    if (!canSubmit) return
    onSave({
      id: reservation?.id,
      name: name.trim(),
      contact: contact.trim(),
      numbers: selectedNumbers,
      productOptions,
      productQuantity: event.kind === 'product' ? productQuantity : 0,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-4xl font-medium text-marca">{reservation ? 'Editar Reserva' : 'Nova Reserva'}</h2>

      <section className="mt-5">
        <h3 className="text-3xl font-medium">Seus dados</h3>
        <label htmlFor={`${formId}-name`} className="mt-5 block text-lg font-medium">
          Nome*
        </label>
        <input
          id={`${formId}-name`}
          value={name}
          onChange={(changeEvent) => setName(changeEvent.target.value)}
          placeholder="Ex: João Maria da Silva"
          required
          className={fieldClasses}
        />
        <label htmlFor={`${formId}-contact`} className="mt-4 block text-lg font-medium">
          Telefone ou e-mail
        </label>
        <input
          id={`${formId}-contact`}
          value={contact}
          onChange={(changeEvent) => setContact(changeEvent.target.value)}
          placeholder="(00) 98765-4321"
          className={fieldClasses}
        />
      </section>

      <section className="mt-6 border-t-2 border-cinza-medio pt-5 dark:border-cinza-claro">
        <h3 className="text-3xl font-medium">Reserva</h3>
        {event.kind === 'raffle' ? (
          <>
            <div className="mt-4 grid grid-cols-8 gap-2">
              {raffleNumbers.map((number) => {
                const selected = numbers.has(number)
                const unavailable = unavailableNumbers.has(number)
                return (
                  <button
                    key={number}
                    type="button"
                    disabled={unavailable}
                    aria-pressed={selected}
                    onClick={() => toggleNumber(number)}
                    className={`aspect-square rounded-md border-2 text-base font-medium transition-colors sm:text-lg ${
                      unavailable
                        ? 'cursor-not-allowed border-cinza-claro bg-cinza-medio text-cinza-claro'
                        : selected
                          ? 'border-marca bg-marca text-marca-clara'
                          : 'border-marca bg-marca-clara text-marca hover:bg-marca hover:text-marca-clara'
                    }`}
                  >
                    {String(number).padStart(2, '0')}
                  </button>
                )
              })}
            </div>
            {Number.isFinite(maxItems) && (
              <p className="mt-3 text-sm text-cinza-medio dark:text-cinza-claro">
                Selecione até {maxItems} números.
              </p>
            )}
          </>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label htmlFor={`${formId}-quantity`} className="font-medium">
              Quantidade
              <input
                id={`${formId}-quantity`}
                type="number"
                min="1"
                max={Number.isFinite(maxItems) ? maxItems : undefined}
                value={productQuantity}
                onChange={(changeEvent) => setProductQuantity(Number(changeEvent.target.value))}
                className={fieldClasses}
              />
            </label>
            {variations.map((variation) => (
              <label key={variation.id} htmlFor={`${formId}-option-${variation.id}`} className="font-medium">
                {variation.name}
                <select
                  id={`${formId}-option-${variation.id}`}
                  value={productOptions[variation.name] ?? ''}
                  onChange={(changeEvent) => setProductOptions((current) => ({
                    ...current,
                    [variation.name]: changeEvent.target.value,
                  }))}
                  className={fieldClasses}
                >
                  <option value="">Selecione</option>
                  {variation.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 mt-6 rounded-full bg-marca p-3">
        {showSelection && event.kind === 'raffle' && selectedNumbers.length > 0 && (
          <p className="mb-3 rounded-full bg-marca-clara px-4 py-3 text-center text-marca">
            Números escolhidos: {selectedNumbers.map((number) => String(number).padStart(2, '0')).join(', ')}
          </p>
        )}
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Action
            onClick={onCancel}
            size="small"
            variant="secondary-on-brand"
            className="px-5"
          >
            Cancelar
          </Action>
          <button
            type="button"
            onClick={() => setShowSelection((current) => !current)}
            className="flex min-w-0 items-center justify-center gap-2 rounded-full bg-marca-clara px-3 font-medium text-marca"
          >
            <strong className="flex size-7 shrink-0 items-center justify-center rounded-full bg-marca-escura text-marca-clara">
              {itemCount}
            </strong>
            <span className="truncate">{event.kind === 'raffle' ? 'Ver números escolhidos' : `${itemCount} unidade(s)`}</span>
            <Icon name="arrow-separate-vertical" className="size-4 shrink-0" />
          </button>
          <Action
            type="submit"
            disabled={!canSubmit}
            size="small"
            variant="secondary-on-brand"
            className="col-span-2 px-5 sm:col-span-1"
          >
            Finalizar reserva · R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Action>
        </div>
      </div>
    </form>
  )
}
