import { useEffect, useId, useState } from 'react'
import { Dialog } from '@abrigo/shared'
import {
  ReservationCheckoutDialog,
  ReservationConfirmationDialog,
} from './ReservationDialogs'
import { ReservationBar } from './ReservationBar'
import { ReservationSummaryButton } from './ReservationSummaryButton'
import { formatCurrency } from './reservation'

type RaffleReservationFlowProps = {
  description: string
  image: string
  onClose: () => void
  prize: string
  title: string
  winner: string
}

type FlowStage = 'checkout' | 'confirmation' | 'raffle'

const TOTAL_NUMBERS = 100
const NUMBER_PRICE = 10
const VISIBLE_NUMBER_LIMIT = 3
const RESERVED_NUMBERS = new Set([
  1, 17, 44, 47, 52, 56, 64, 67, 73, 74, 75, 79, 80, 89, 90, 91, 92, 93, 94, 95, 96, 97,
  98, 99, 100,
])

function formatNumber(number: number) {
  return String(number).padStart(2, '0')
}

export function RaffleReservationFlow({
  description,
  image,
  onClose,
  prize,
  title,
  winner,
}: RaffleReservationFlowProps) {
  const [stage, setStage] = useState<FlowStage>('raffle')
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([])
  const [barNumbers, setBarNumbers] = useState<number[]>([])
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [selectionExpanded, setSelectionExpanded] = useState(false)
  const titleId = useId()
  const availableCount = TOTAL_NUMBERS - RESERVED_NUMBERS.size
  const total = selectedNumbers.length * NUMBER_PRICE
  const selectedLabel = selectedNumbers.map(formatNumber).join(', ')
  const countLabel = selectedNumbers.length === 1 ? 'Número' : 'Números'
  const barVisible = selectedNumbers.length > 0
  const displayedBarNumbers = barVisible ? selectedNumbers : barNumbers
  const displayedBarLabel = displayedBarNumbers.map(formatNumber).join(', ')
  const displayedBarTotal = displayedBarNumbers.length * NUMBER_PRICE
  const barHasHiddenNumbers = displayedBarNumbers.length > VISIBLE_NUMBER_LIMIT

  useEffect(() => {
    if (selectedNumbers.length > 0) {
      setBarNumbers(selectedNumbers)
    } else {
      setSelectionExpanded(false)
    }
  }, [selectedNumbers])

  const toggleNumber = (number: number) => {
    setSelectedNumbers((numbers) =>
      numbers.includes(number)
        ? numbers.filter((selected) => selected !== number)
        : [...numbers, number].sort((a, b) => a - b),
    )
  }

  const clearSelection = () => {
    setSelectedNumbers([])
    setSelectionExpanded(false)
  }

  const checkoutDialog =
    stage === 'checkout' || stage === 'confirmation' ? (
      <ReservationCheckoutDialog
        active={stage === 'checkout'}
        title={`Reservar ${selectedNumbers.length} ${countLabel}`}
        onBack={() => setStage('raffle')}
        onConfirm={() => setStage('confirmation')}
      >
        <section className="mt-4">
          <h3 className="text-2xl font-medium">Reserva</h3>
          <p>Números escolhidos: {selectedLabel}</p>
          <p>Total: {formatCurrency(total)}</p>
        </section>
      </ReservationCheckoutDialog>
    ) : null

  const confirmationDialog = stage === 'confirmation' ? (
    <ReservationConfirmationDialog onClose={onClose}>
      <section className="mt-4">
        <h3 className="text-2xl font-medium sm:text-3xl">Reserva</h3>
        <p>Números escolhidos: {selectedLabel}</p>
        <p>Total: {formatCurrency(total)}</p>
      </section>
    </ReservationConfirmationDialog>
  ) : null

  return (
    <>
      <Dialog
        active={stage === 'raffle'}
        ariaLabelledBy={titleId}
        onClose={onClose}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised"
      >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 sm:px-8 sm:pt-8 lg:px-10">
        <div className="grid grid-cols-[minmax(7rem,32%)_1fr] gap-5 lg:grid-cols-[30%_1fr] lg:gap-12">
          <div>
            <img src={image} alt={title} className="aspect-square w-full object-cover" />
            <div className="mt-4 flex flex-col gap-2 text-center text-xs sm:text-sm">
              <p className="rounded-md bg-marca px-2 py-2 text-marca-clara">Prêmio: {prize}</p>
              <p className="rounded-md bg-marca-clara px-2 py-2 text-marca">Ganhador: {winner}</p>
            </div>
          </div>

          <div>
            <h2 id={titleId} className="text-3xl leading-tight font-medium text-marca lg:text-4xl">
              {title}
            </h2>
            <p
              className={`mt-3 text-center text-sm leading-normal lg:mt-8 lg:text-justify lg:text-base ${descriptionExpanded ? '' : 'line-clamp-6 lg:line-clamp-none'}`}
            >
              {description}
            </p>
            <button
              type="button"
              className="mx-auto mt-1 block cursor-pointer text-sm underline underline-offset-2 lg:hidden"
              onClick={() => setDescriptionExpanded((expanded) => !expanded)}
            >
              {descriptionExpanded ? 'Mostrar menos' : 'Ler descrição completa'}
            </button>
          </div>
        </div>

        <section className="mx-auto mt-10 max-w-2xl text-center" aria-labelledby={`${titleId}-status`}>
          <h3 id={`${titleId}-status`} className="text-2xl font-medium">
            Atualização
          </h3>
          <div className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span>Reservados</span>
            <div className="flex h-9 overflow-hidden rounded-md" aria-label={`${RESERVED_NUMBERS.size} números reservados e ${availableCount} disponíveis`}>
              <span
                className="flex items-center justify-center bg-cinza-medio text-cinza-claro"
                style={{ width: `${RESERVED_NUMBERS.size}%` }}
              >
                {RESERVED_NUMBERS.size}
              </span>
              <span
                className="flex items-center justify-center bg-marca-clara text-marca"
                style={{ width: `${availableCount}%` }}
              >
                {availableCount}
              </span>
            </div>
            <span>Disponíveis</span>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-2xl pb-4" aria-labelledby={`${titleId}-numbers`}>
          <h3 id={`${titleId}-numbers`} className="text-center text-2xl font-medium">
            Escolha seus números
          </h3>
          <div className="mt-5 grid grid-cols-8 gap-2 sm:gap-3 lg:grid-cols-10">
            {Array.from({ length: TOTAL_NUMBERS }, (_, index) => index + 1).map((number) => {
              const reserved = RESERVED_NUMBERS.has(number)
              const selected = selectedNumbers.includes(number)
              const state = reserved ? 'reservado' : selected ? 'selecionado' : 'disponível'

              return (
                <button
                  key={number}
                  type="button"
                  disabled={reserved}
                  aria-pressed={selected}
                  aria-label={`Número ${formatNumber(number)}: ${state}`}
                  onClick={() => toggleNumber(number)}
                  className={`aspect-square rounded-md border-2 text-sm font-medium transition-colors sm:text-base ${
                    reserved
                      ? 'cursor-not-allowed border-cinza-claro bg-cinza-medio text-cinza-claro'
                      : selected
                        ? 'border-marca bg-marca text-marca-clara'
                        : 'cursor-pointer border-marca bg-marca-clara text-marca hover:bg-marca hover:text-marca-clara'
                  }`}
                >
                  {formatNumber(number)}
                </button>
              )
            })}
          </div>
        </section>
      </div>

      <div
        inert={!barVisible}
        className={`grid shrink-0 transition-[grid-template-rows,opacity,transform] duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          barVisible
            ? 'grid-rows-[1fr] translate-y-0 opacity-100'
            : 'pointer-events-none grid-rows-[0fr] translate-y-2 opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ReservationBar
            className="m-4 mt-2 lg:mx-auto lg:w-[calc(100%_-_2.5rem)] lg:max-w-3xl"
            secondaryLabel="Limpar"
            onSecondary={clearSelection}
            onFinish={() => setStage('checkout')}
            finishDisabled={selectedNumbers.length === 0}
            expandedContent={barHasHiddenNumbers && selectionExpanded && (
              <p className="mb-2 px-3 text-center text-sm text-marca-clara">
                Números escolhidos: {displayedBarLabel}
              </p>
            )}
          >
            {barHasHiddenNumbers ? (
              <ReservationSummaryButton
                count={displayedBarNumbers.length}
                expanded={selectionExpanded}
                singularLabel="número escolhido"
                pluralLabel="números escolhidos"
                onToggle={() => setSelectionExpanded((expanded) => !expanded)}
                total={displayedBarTotal}
              />
            ) : (
              <div className="min-w-0 text-center text-sm leading-tight text-marca-clara">
                <span
                  className="block sm:hidden"
                  aria-label={`Números escolhidos: ${displayedBarLabel}`}
                >
                  {displayedBarLabel}
                </span>
                <span className="hidden truncate sm:block">
                  Números escolhidos: {displayedBarLabel}
                </span>
                <span className="block font-medium">{formatCurrency(displayedBarTotal)}</span>
              </div>
            )}
          </ReservationBar>
        </div>
      </div>
      </Dialog>
      {checkoutDialog}
      {confirmationDialog}
    </>
  )
}
