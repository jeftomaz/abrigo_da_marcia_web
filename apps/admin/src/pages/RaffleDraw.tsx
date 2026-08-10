import { useEffect, useRef, useState } from 'react'
import { Action, Dialog, getAdminErrorMessage, useAdminEvents, useDrawRafflePrize, useEventReservations } from '@abrigo/shared'
import { useParams } from 'react-router-dom'
import type { RafflePrize } from '../events/events'

type DrawWinner = { name: string; number: number }

function prizeWinner(prize?: RafflePrize): DrawWinner | null {
  return typeof prize?.winningNumber === 'number' && prize.winnerName
    ? { name: prize.winnerName, number: prize.winningNumber }
    : null
}

function initialPrizeId(prizes: RafflePrize[], preferPending: boolean) {
  return (preferPending ? prizes.find((prize) => !prizeWinner(prize))?.id : undefined) ?? prizes[0]?.id ?? ''
}

function randomIndex(length: number) {
  const random = new Uint32Array(1)
  crypto.getRandomValues(random)
  return random[0] % length
}

export function RaffleDraw() {
  const { eventId = '' } = useParams()
  const { data: events = [], isLoading } = useAdminEvents()
  const { data: reservations = [], error: reservationsError, isLoading: isLoadingReservations } = useEventReservations(eventId)
  const drawPrize = useDrawRafflePrize(eventId)
  const event = events.find((item) => item.id === eventId)
  const timeoutRef = useRef<number | null>(null)
  const shortageConfirmedRef = useRef(false)
  const [prizes, setPrizes] = useState<RafflePrize[]>([])
  const [currentPrizeId, setCurrentPrizeId] = useState('')
  const [displayNumber, setDisplayNumber] = useState<number | null>(null)
  const [winner, setWinner] = useState<DrawWinner | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawError, setDrawError] = useState('')
  const [showShortageWarning, setShowShortageWarning] = useState(false)

  useEffect(() => () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current) }, [])
  useEffect(() => {
    shortageConfirmedRef.current = false
    setShowShortageWarning(false)
  }, [eventId])

  useEffect(() => {
    const nextPrizes = event?.prizes ?? []
    const nextPrizeId = initialPrizeId(nextPrizes, event?.status === 'active')
    const nextWinner = prizeWinner(nextPrizes.find((prize) => prize.id === nextPrizeId))
    setPrizes(nextPrizes)
    setCurrentPrizeId(nextPrizeId)
    setDisplayNumber(nextWinner?.number ?? null)
    setWinner(nextWinner)
    setIsDrawing(false)
  }, [event])

  if (isLoading) return <main role="status" className="min-h-screen bg-marca p-8 text-marca-clara">Carregando rifa...</main>
  if (isLoadingReservations) return <main role="status" className="min-h-screen bg-marca p-8 text-marca-clara">Carregando reservas...</main>
  if (reservationsError) return <main role="alert" className="min-h-screen bg-marca p-8 text-marca-clara">Não foi possível carregar as reservas do sorteio.</main>
  if (!event || event.kind !== 'raffle') {
    return <main className="flex min-h-screen flex-col items-start gap-8 bg-marca p-6 text-marca-clara"><Action to="/eventos" icon="arrow-left-circle-solid" size="small" variant="primary-on-brand">Voltar</Action><h1 className="text-5xl font-medium">Rifa não encontrada</h1></main>
  }

  const currentPrize = prizes.find((prize) => prize.id === currentPrizeId)
  const currentPrizeIndex = prizes.findIndex((prize) => prize.id === currentPrizeId)
  const nextPrize = [...prizes.slice(currentPrizeIndex + 1), ...prizes.slice(0, Math.max(0, currentPrizeIndex))].find((prize) => !prizeWinner(prize))
  const totalNumbers = Math.max(1, Number(event.raffleTotalNumbers) || 1)
  const numberDigits = Math.max(2, String(totalNumbers).length)
  const canDraw = event.status === 'active'
  const paidNumberCount = reservations.filter((reservation) => reservation.status === 'paid' || reservation.status === 'delivered').reduce((count, reservation) => count + reservation.numbers.length, 0)
  const drawnNumberCount = new Set(prizes.flatMap((prize) => typeof prize.winningNumber === 'number' ? [prize.winningNumber] : [])).size
  const pendingPrizeCount = prizes.filter((prize) => !prizeWinner(prize)).length
  const eligibleNumberCount = Math.max(0, paidNumberCount - drawnNumberCount)
  const hasPrizeShortage = eligibleNumberCount < pendingPrizeCount
  const drawActionLabel = isDrawing ? 'Sorteando...' : winner && nextPrize ? 'Próximo Sorteio' : winner ? 'Sortear novamente' : 'Sortear'

  const selectPrize = (prize: RafflePrize) => {
    if (isDrawing) return
    const recordedWinner = prizeWinner(prize)
    setCurrentPrizeId(prize.id)
    setDisplayNumber(recordedWinner?.number ?? null)
    setWinner(recordedWinner)
    setDrawError('')
  }

  const revealWinner = (entry: DrawWinner) => {
    setPrizes((current) => current.map((prize) => prize.id === currentPrizeId ? { ...prize, winnerName: entry.name, winningNumber: entry.number, drawnAt: new Date().toISOString() } : prize))
    setDisplayNumber(entry.number)
    setWinner(entry)
    setIsDrawing(false)
  }

  const runDraw = async () => {
    if (!canDraw || !currentPrize || isDrawing || paidNumberCount === 0) return
    setDrawError('')
    setIsDrawing(true)
    setWinner(null)
    try {
      const result = await drawPrize.mutateAsync(currentPrize.id)
      const entry = { name: result.winner_name, number: result.winning_number }
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) { revealWinner(entry); return }
      let step = 0
      const animateNumber = () => {
        step += 1
        setDisplayNumber(randomIndex(totalNumbers) + 1)
        if (step >= 26) { timeoutRef.current = window.setTimeout(() => revealWinner(entry), 260); return }
        const progress = step / 26
        timeoutRef.current = window.setTimeout(animateNumber, 45 + Math.round(progress * progress * 150))
      }
      animateNumber()
    } catch (error) {
      setIsDrawing(false)
      setDrawError(getAdminErrorMessage(error, 'Não foi possível concluir o sorteio.'))
    }
  }

  const handleDrawAction = () => {
    if (winner && nextPrize) {
      selectPrize(nextPrize)
      return
    }
    if (hasPrizeShortage && !shortageConfirmedRef.current) {
      setShowShortageWarning(true)
      return
    }
    void runDraw()
  }

  const prizeList = (
    <section aria-label="Prêmios">
      <h2 className="mb-3 text-center text-3xl font-medium desk:mb-4 desk:text-left">Prêmios</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 desk:flex-col desk:overflow-visible">
        {prizes.map((prize, index) => {
          const isCurrent = prize.id === currentPrizeId
          const complete = Boolean(prizeWinner(prize))
          return <button key={prize.id} type="button" disabled={isDrawing} onClick={() => selectPrize(prize)} aria-pressed={isCurrent} className={`flex min-h-16 min-w-52 items-center justify-between gap-3 rounded-2xl px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:opacity-50 desk:min-h-20 desk:min-w-0 desk:px-5 desk:py-3 ${isCurrent ? 'bg-marca-escura text-marca-clara' : complete ? 'bg-marca-clara text-marca' : 'bg-marca-clara/70 text-marca-escura'}`}><span className="min-w-0"><strong className="block truncate text-xl font-medium desk:text-2xl">{prize.name}</strong><span className="text-xs desk:text-sm">Prêmio {index + 1}{complete ? ' · Realizado' : ''}</span></span><span aria-hidden="true" className="text-3xl desk:text-4xl">›</span></button>
        })}
      </div>
    </section>
  )

  return (
    <main className="min-h-screen overflow-x-hidden bg-marca text-marca-clara">
      <div className="mx-auto grid min-h-screen w-full max-w-[160rem] gap-4 px-4 py-5 sm:px-8 sm:py-8 desk:grid-cols-[20rem_minmax(0,1fr)] desk:gap-12">
        <aside className="min-w-0"><Action to="/eventos" icon="arrow-left-circle-solid" size="small" variant="primary-on-brand" className="min-h-12 text-lg">Voltar</Action><h1 className="mt-4 text-4xl leading-none font-medium sm:text-5xl desk:mt-8 desk:text-5xl">{event.title}</h1><p className="mt-2 text-3xl leading-none desk:text-4xl">Sorteio</p><div className="mt-8 hidden desk:block">{prizeList}</div></aside>
        <section className="flex min-w-0 flex-col items-center text-center desk:pr-80">
          <button type="button" onClick={handleDrawAction} disabled={!canDraw || isDrawing} aria-label={canDraw ? `${drawActionLabel} pela esfera` : 'Sorteio indisponível'} data-drawing={isDrawing} className="raffle-draw-ball flex aspect-square w-[min(76vw,24rem)] cursor-pointer items-center justify-center rounded-full bg-white text-marca focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-marca-clara disabled:cursor-not-allowed desk:w-full desk:max-w-[34rem]"><strong key={displayNumber ?? 'waiting'} className={`raffle-draw-number block leading-none font-medium ${displayNumber === null ? 'text-[7rem] opacity-35 desk:text-[9rem]' : 'text-[clamp(7rem,30vw,12rem)] desk:text-[12rem]'}`}>{displayNumber === null ? '?' : String(displayNumber).padStart(numberDigits, '0')}</strong></button>
          <div aria-live="polite" className="mt-5 w-full desk:mt-10">
            {winner ? <div className="raffle-draw-result"><p className="text-2xl desk:text-3xl">Ganhador</p><p className="mt-1 text-3xl leading-tight font-medium sm:text-4xl desk:mt-2 desk:text-5xl">{winner.name}</p><p className="mt-5 text-xl desk:mt-10 desk:text-2xl">Prêmio</p><p className="mt-1 text-2xl leading-tight font-medium sm:text-3xl desk:mt-2 desk:text-4xl">{currentPrize?.name}</p></div> : !canDraw ? <p className="pt-4 text-2xl font-medium desk:pt-12 desk:text-3xl">Sorteio sem resultado registrado</p> : null}
            {drawError && <p role="alert" className="mt-4 text-xl font-medium">{drawError}</p>}
          </div>
          {canDraw && <Action onClick={handleDrawAction} disabled={isDrawing} icon="dice-five" size="small" variant="secondary-on-brand" className="mt-4 min-h-12 text-base desk:mt-2">{drawActionLabel}</Action>}
          <div className="mt-6 w-full desk:hidden">{prizeList}</div>
        </section>
      </div>
      {showShortageWarning && (
        <Dialog ariaLabel="Reservas insuficientes para o sorteio" onClose={() => setShowShortageWarning(false)} className="w-full max-w-xl rounded-3xl bg-surface-raised p-8 text-left text-on-surface-raised sm:p-10">
          <h2 className="text-3xl font-medium text-marca">Reservas pagas insuficientes</h2>
          <p className="mt-4 text-lg">
            Há {eligibleNumberCount} {eligibleNumberCount === 1 ? 'número pago ainda elegível' : 'números pagos ainda elegíveis'} para {pendingPrizeCount} {pendingPrizeCount === 1 ? 'prêmio não sorteado' : 'prêmios não sorteados'}.
          </p>
          <p className="mt-3">
            {eligibleNumberCount === 0
              ? 'O sorteio não pode começar enquanto nenhuma reserva estiver paga.'
              : 'Nem todos os prêmios poderão receber um número ganhador. Deseja iniciar mesmo assim?'}
          </p>
          <div className="mt-8 flex gap-4">
            <Action onClick={() => setShowShortageWarning(false)} size="small" variant="secondary-adaptive" className="min-w-0 flex-1">
              {eligibleNumberCount === 0 ? 'Entendi' : 'Cancelar'}
            </Action>
            {eligibleNumberCount > 0 && (
              <Action onClick={() => { shortageConfirmedRef.current = true; setShowShortageWarning(false); void runDraw() }} size="small" variant="primary-adaptive" icon="dice-five" className="min-w-0 flex-1">
                Iniciar sorteio
              </Action>
            )}
          </div>
        </Dialog>
      )}
    </main>
  )
}
