import { useEffect, useRef, useState } from 'react'
import { Action, useAdminEvents, useDrawRafflePrize, useEventReservations } from '@abrigo/shared'
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
  const [prizes, setPrizes] = useState<RafflePrize[]>([])
  const [currentPrizeId, setCurrentPrizeId] = useState('')
  const [displayNumber, setDisplayNumber] = useState<number | null>(null)
  const [winner, setWinner] = useState<DrawWinner | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawError, setDrawError] = useState('')

  useEffect(() => () => { if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current) }, [])

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
  const paidNumberCount = reservations.filter((reservation) => reservation.status === 'paid').reduce((count, reservation) => count + reservation.numbers.length, 0)

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
      setDrawError(error instanceof Error ? error.message : 'Não foi possível concluir o sorteio.')
    }
  }

  const handleDrawAction = () => {
    if (winner && nextPrize) selectPrize(nextPrize)
    else void runDraw()
  }

  const prizeList = (
    <section aria-label="Prêmios">
      <h2 className="mb-4 text-center text-3xl font-medium desk:text-left">Prêmios</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 desk:flex-col desk:overflow-visible">
        {prizes.map((prize, index) => {
          const isCurrent = prize.id === currentPrizeId
          const complete = Boolean(prizeWinner(prize))
          return <button key={prize.id} type="button" disabled={isDrawing} onClick={() => selectPrize(prize)} aria-pressed={isCurrent} className={`flex min-h-20 min-w-64 items-center justify-between gap-3 rounded-2xl px-5 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:opacity-50 desk:min-w-0 ${isCurrent ? 'bg-marca-escura text-marca-clara' : complete ? 'bg-marca-clara text-marca' : 'bg-marca-clara/70 text-marca-escura'}`}><span className="min-w-0"><strong className="block truncate text-2xl font-medium">{prize.name}</strong><span className="text-sm">Prêmio {index + 1}{complete ? ' · Realizado' : ''}</span></span><span aria-hidden="true" className="text-4xl">›</span></button>
        })}
      </div>
    </section>
  )

  return (
    <main className="min-h-screen overflow-x-hidden bg-marca text-marca-clara">
      <div className="mx-auto grid min-h-screen w-full max-w-[160rem] gap-8 px-4 py-5 sm:px-8 sm:py-8 desk:grid-cols-[20rem_minmax(0,1fr)] desk:gap-12">
        <aside className="min-w-0"><Action to="/eventos" icon="arrow-left-circle-solid" size="small" variant="primary-on-brand" className="min-h-12 px-5 py-2 text-lg">Voltar</Action><h1 className="mt-8 text-5xl leading-none font-medium sm:text-6xl desk:text-5xl">{event.title}</h1><p className="mt-2 text-4xl leading-none">Sorteio</p><div className="mt-8 hidden desk:block">{prizeList}</div></aside>
        <section className="flex min-w-0 flex-col items-center text-center desk:pr-80">
          <div data-drawing={isDrawing} className="raffle-draw-ball flex aspect-[9/10] w-full max-w-[34rem] items-center justify-center rounded-full bg-white text-marca desk:aspect-square"><strong key={displayNumber ?? 'waiting'} className={`raffle-draw-number block leading-none font-medium ${displayNumber === null ? 'text-[9rem] opacity-35' : 'text-[clamp(8rem,32vw,15rem)] desk:text-[12rem]'}`}>{displayNumber === null ? '?' : String(displayNumber).padStart(numberDigits, '0')}</strong></div>
          <div aria-live="polite" className="mt-10 min-h-48 w-full">
            {winner ? <div className="raffle-draw-result"><p className="text-3xl">Ganhador</p><p className="mt-2 text-4xl leading-tight font-medium sm:text-5xl">{winner.name}</p><p className="mt-10 text-2xl">Prêmio</p><p className="mt-2 text-3xl leading-tight font-medium sm:text-4xl">{currentPrize?.name}</p></div> : !canDraw ? <p className="pt-12 text-3xl font-medium">Sorteio sem resultado registrado</p> : null}
            {drawError && <p role="alert" className="mt-4 text-xl font-medium">{drawError}</p>}
          </div>
          {canDraw && <Action onClick={handleDrawAction} disabled={isDrawing || (paidNumberCount === 0 && !winner)} icon="dice-five" size="small" variant="secondary-on-brand" className="mt-2 min-h-12 px-7 text-base">{isDrawing ? 'Sorteando...' : winner && nextPrize ? 'Próximo Sorteio' : winner ? 'Sortear novamente' : paidNumberCount > 0 ? 'Sortear' : 'Sem números pagos'}</Action>}
          <div className="mt-10 w-full desk:hidden">{prizeList}</div>
        </section>
      </div>
    </main>
  )
}
