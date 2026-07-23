import { useEffect, useId, useState } from 'react'
import { Dialog, ImagePlaceholder, getEventPhotoUrl, parseCurrencyToCents, useRaffleNumbers, useReserveRaffle } from '@abrigo/shared'
import type { FundraisingEvent, ReservationResult } from '@abrigo/shared'
import { PixConfirmationDialog, ReservationCheckoutDialog } from './ReservationDialogs'
import { ReservationBar } from './ReservationBar'
import { ReservationSummaryButton } from './ReservationSummaryButton'
import { formatCurrency } from './reservation'

type RaffleReservationFlowProps = {
  event: FundraisingEvent
  onClose: () => void
}

type FlowStage = 'checkout' | 'confirmation' | 'raffle'
const VISIBLE_NUMBER_LIMIT = 3

function formatNumber(number: number, digits: number) {
  return String(number).padStart(digits, '0')
}

export function RaffleReservationFlow({ event, onClose }: RaffleReservationFlowProps) {
  const [stage, setStage] = useState<FlowStage>('raffle')
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [barNumbers, setBarNumbers] = useState<number[]>([])
  const [selectionExpanded, setSelectionExpanded] = useState(false)
  const [result, setResult] = useState<ReservationResult | null>(null)
  const titleId = useId()
  const reservable = event.status === 'active'
  const numbersQuery = useRaffleNumbers(event.id, reservable)
  const reserveMutation = useReserveRaffle()
  const totalNumbers = Number(event.raffleTotalNumbers)
  const maxItems = Number(event.maxItemsPerReservation) || Number.POSITIVE_INFINITY
  const numberPrice = parseCurrencyToCents(event.raffleNumberPrice) / 100
  const numberDigits = Math.max(2, String(totalNumbers).length)
  const numberStates = reservable
    ? numbersQuery.data ?? []
    : Array.from({ length: totalNumbers }, (_, index) => ({ number: index + 1, available: false }))
  const availableCount = numberStates.filter((number) => number.available).length
  const reservedCount = Math.max(0, totalNumbers - availableCount)
  const total = selectedNumbers.length * numberPrice
  const displayedBarNumbers = selectedNumbers.length ? selectedNumbers : barNumbers
  const displayedBarLabel = displayedBarNumbers.map((number) => formatNumber(number, numberDigits)).join(', ')
  const barHasHiddenNumbers = displayedBarNumbers.length > VISIBLE_NUMBER_LIMIT

  useEffect(() => {
    if (selectedNumbers.length > 0) setBarNumbers(selectedNumbers)
    else setSelectionExpanded(false)
  }, [selectedNumbers])

  useEffect(() => {
    if (!numbersQuery.data) return
    const available = new Set(numbersQuery.data.filter((number) => number.available).map((number) => number.number))
    setSelectedNumbers((current) => current.filter((number) => available.has(number)))
  }, [numbersQuery.data])

  const toggleNumber = (number: number) => {
    setSelectedNumbers((numbers) => numbers.includes(number)
      ? numbers.filter((selected) => selected !== number)
      : numbers.length < maxItems ? [...numbers, number].sort((a, b) => a - b) : numbers)
  }

  const checkoutDialog = stage === 'checkout' || stage === 'confirmation' ? (
    <ReservationCheckoutDialog
      active={stage === 'checkout'}
      title={`Reservar ${selectedNumbers.length} ${selectedNumbers.length === 1 ? 'número' : 'números'}`}
      onBack={() => setStage('raffle')}
      isSubmitting={reserveMutation.isPending}
      error={reserveMutation.error instanceof Error ? reserveMutation.error.message : undefined}
      onConfirm={async (customer) => {
        const reservation = await reserveMutation.mutateAsync({
          eventId: event.id,
          numbers: selectedNumbers,
          ...customer,
        })
        setResult(reservation)
        setStage('confirmation')
      }}
    >
      <section className="mt-4">
        <h3 className="text-2xl font-medium">Reserva</h3>
        <p>Números escolhidos: {selectedNumbers.map((number) => formatNumber(number, numberDigits)).join(', ')}</p>
        <p>Total: {formatCurrency(total)}</p>
      </section>
    </ReservationCheckoutDialog>
  ) : null

  const confirmationDialog = stage === 'confirmation' && result ? (
    <PixConfirmationDialog
      title="Reserva confirmada!"
      expiresAt={result.expiresAt}
      pixCode={result.pixCode}
      pixCity={event.city}
      pixKey={event.paymentKey}
      pixReceiver={event.paymentReceiver}
      postPaymentInstructions={result.postPaymentInstructions}
      onClose={onClose}
    >
      <section className="mt-4">
        <h3 className="text-2xl font-medium sm:text-3xl">Reserva</h3>
        <p>Números escolhidos: {selectedNumbers.map((number) => formatNumber(number, numberDigits)).join(', ')}</p>
        <p>Total: {formatCurrency(result.totalCents / 100)}</p>
      </section>
    </PixConfirmationDialog>
  ) : null

  return (
    <>
      <Dialog
        active={stage === 'raffle'}
        ariaLabelledBy={titleId}
        onClose={onClose}
        persistentClose
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-16 sm:px-8 lg:px-10">
          <div className="grid grid-cols-[minmax(7rem,32%)_1fr] gap-5 lg:grid-cols-[30%_1fr] lg:gap-12">
            <div>
              {event.gallery[0]
                ? <img src={getEventPhotoUrl(event.gallery[0])} alt={event.title} className="aspect-square w-full object-cover" />
                : <ImagePlaceholder label={`Sem foto de ${event.title}`} className="aspect-square w-full" />}
              <div className="mt-4 flex flex-col gap-2 text-center text-xs sm:text-sm">
                {event.prizes.map((prize, index) => (
                  <div key={prize.id} className="rounded-md bg-marca px-2 py-2 text-marca-clara">
                    {prize.image && <img src={getEventPhotoUrl(prize.image)} alt={`Prêmio ${index + 1}: ${prize.name}`} className="mb-2 aspect-square w-full rounded-md object-cover" />}
                    <p>Prêmio {index + 1}: {prize.name}</p>
                    {prize.winningNumber && <p className="mt-1">Nº {formatNumber(prize.winningNumber, numberDigits)} — {prize.winnerName}</p>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 id={titleId} className="text-3xl leading-tight font-medium text-marca lg:text-4xl">{event.title}</h2>
              <p className="mt-3 text-sm leading-normal lg:mt-8 lg:text-base">{event.description}</p>
              {!reservable && <p className="mt-6 rounded-2xl bg-cinza-claro p-4 text-center text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">Esta rifa já foi encerrada.</p>}
            </div>
          </div>

          {reservable && (
            <>
              <section className="mx-auto mt-10 max-w-2xl text-center" aria-labelledby={`${titleId}-status`}>
                <h3 id={`${titleId}-status`} className="text-2xl font-medium">Atualização</h3>
                <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                  <span>Reservados</span>
                  <div className="flex h-9 overflow-hidden rounded-md" aria-label={`${reservedCount} números reservados e ${availableCount} disponíveis`}>
                    <span className="flex items-center justify-center bg-cinza-medio text-cinza-claro" style={{ width: `${totalNumbers ? reservedCount / totalNumbers * 100 : 0}%` }}>{reservedCount}</span>
                    <span className="flex items-center justify-center bg-marca-clara text-marca" style={{ width: `${totalNumbers ? availableCount / totalNumbers * 100 : 100}%` }}>{availableCount}</span>
                  </div>
                  <span>Disponíveis</span>
                </div>
              </section>

              <section className="mx-auto mt-6 max-w-2xl pb-4" aria-labelledby={`${titleId}-numbers`}>
                <h3 id={`${titleId}-numbers`} className="text-center text-2xl font-medium">Escolha seus números</h3>
                {numbersQuery.isLoading ? <p role="status" className="mt-5 text-center">Carregando números...</p> : numbersQuery.error ? <p role="alert" className="mt-5 text-center text-marca">Não foi possível carregar os números disponíveis.</p> : (
                  <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 sm:gap-3 lg:grid-cols-10">
                    {numberStates.map(({ number, available }) => {
                      const selected = selectedNumbers.includes(number)
                      return (
                        <button
                          key={number}
                          type="button"
                          disabled={!available}
                          aria-pressed={selected}
                          aria-label={`Número ${formatNumber(number, numberDigits)}: ${available ? selected ? 'selecionado' : 'disponível' : 'reservado'}`}
                          onClick={() => toggleNumber(number)}
                          className={`aspect-square min-h-11 rounded-md border-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca sm:text-base ${!available ? 'cursor-not-allowed border-cinza-claro bg-cinza-medio text-cinza-claro' : selected ? 'border-marca bg-marca text-marca-clara' : 'cursor-pointer border-marca bg-marca-clara text-marca hover:bg-marca hover:text-marca-clara'}`}
                        >
                          {formatNumber(number, numberDigits)}
                        </button>
                      )
                    })}
                  </div>
                )}
                {Number.isFinite(maxItems) && <p className="mt-3 text-center text-sm">Limite de {maxItems} números por reserva.</p>}
              </section>
            </>
          )}
        </div>

        {reservable && (
          <div inert={selectedNumbers.length === 0} className={`grid shrink-0 transition-[grid-template-rows,opacity,transform] duration-200 ${selectedNumbers.length ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] translate-y-2 opacity-0'}`}>
            <div className="min-h-0 overflow-hidden">
              <ReservationBar
                className="m-4 mt-2 lg:mx-auto lg:w-[calc(100%_-_2.5rem)] lg:max-w-3xl"
                secondaryLabel="Limpar"
                onSecondary={() => setSelectedNumbers([])}
                onFinish={() => setStage('checkout')}
                finishDisabled={selectedNumbers.length === 0}
                expandedContent={barHasHiddenNumbers && selectionExpanded && <p className="mb-2 px-3 text-center text-sm text-marca-clara">Números escolhidos: {displayedBarLabel}</p>}
              >
                {barHasHiddenNumbers ? (
                  <ReservationSummaryButton count={displayedBarNumbers.length} expanded={selectionExpanded} singularLabel="número escolhido" pluralLabel="números escolhidos" onToggle={() => setSelectionExpanded((expanded) => !expanded)} total={displayedBarNumbers.length * numberPrice} />
                ) : (
                  <div className="min-w-0 text-center text-sm leading-tight text-marca-clara"><span className="block truncate">Números: {displayedBarLabel}</span><span className="block font-medium">{formatCurrency(displayedBarNumbers.length * numberPrice)}</span></div>
                )}
              </ReservationBar>
            </div>
          </div>
        )}
      </Dialog>
      {checkoutDialog}
      {confirmationDialog}
    </>
  )
}
