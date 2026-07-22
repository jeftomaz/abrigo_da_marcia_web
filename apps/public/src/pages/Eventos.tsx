import { useState } from 'react'
import { Action, CompactCard, getEventPhotoUrl, usePublicEvents } from '@abrigo/shared'
import type { FundraisingEvent } from '@abrigo/shared'
import { ProductReservationFlow } from '../components/ProductReservationFlow'
import { RaffleReservationFlow } from '../components/RaffleReservationFlow'

function EventCard({ event, active, onOpen }: {
  active?: boolean
  event: FundraisingEvent
  onOpen: () => void
}) {
  const image = event.gallery[0]
  return (
    <CompactCard
      orientation="responsive"
      imageAspect="landscape"
      image={image ? { src: getEventPhotoUrl(image), alt: event.title } : undefined}
      title={event.title}
      description={event.description}
      action={
        <Action
          onClick={onOpen}
          size="compact"
          variant={active ? 'primary' : 'secondary'}
          className={active ? '' : 'dark:bg-marca-escura dark:text-marca'}
          aria-label={`${active ? 'Reservar' : 'Conhecer'}: ${event.title}`}
        >
          {active ? 'Quero participar' : 'Conheça o evento'}
        </Action>
      }
    />
  )
}

export function Eventos() {
  const { data: events = [], error, isLoading } = usePublicEvents()
  const [selectedEvent, setSelectedEvent] = useState<FundraisingEvent | null>(null)
  const activeEvent = events.find((event) => event.status === 'active')
  const pastEvents = events.filter((event) => event.status === 'ended')

  return (
    <main className="min-h-screen bg-cinza-claro px-10 pt-10 pb-20 text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro lg:px-6 lg:pt-4">
      <div className="mx-auto max-w-4xl">
        <header className="text-left lg:text-center">
          <h1 className="text-5xl leading-tight font-medium text-marca lg:text-6xl">Cada evento, uma lembrança</h1>
          <p className="mt-6 text-2xl font-medium lg:mt-3">Veja os eventos de arrecadação e ajude o abrigo</p>
        </header>

        {isLoading && <p className="mt-16 text-center text-xl">Carregando eventos...</p>}
        {error && <p role="alert" className="mt-16 text-center text-xl text-marca">Não foi possível carregar os eventos.</p>}

        {!isLoading && !error && (
          <>
            <section aria-labelledby="active-event-title" className="mx-auto mt-10 max-w-2xl">
              <h2 id="active-event-title" className="text-4xl font-medium text-marca">Evento Ativo</h2>
              {activeEvent ? (
                <div className="mx-auto mt-6 w-4/5 lg:w-full"><EventCard event={activeEvent} active onOpen={() => setSelectedEvent(activeEvent)} /></div>
              ) : (
                <p className="mt-6 rounded-3xl bg-surface-raised p-8 text-center text-on-surface-raised">Nenhum evento está recebendo reservas agora.</p>
              )}
            </section>

            <section aria-labelledby="past-events-title" className="mx-auto mt-20 max-w-2xl">
              <h2 id="past-events-title" className="text-4xl font-medium">Eventos Passados</h2>
              <div className="mx-auto mt-6 w-4/5 space-y-12 lg:w-full">
                {pastEvents.map((event) => <EventCard key={event.id} event={event} onOpen={() => setSelectedEvent(event)} />)}
                {pastEvents.length === 0 && <p className="rounded-3xl bg-surface-raised p-8 text-center text-on-surface-raised">O histórico de eventos aparecerá aqui.</p>}
              </div>
            </section>
          </>
        )}
      </div>

      {selectedEvent?.kind === 'product' && <ProductReservationFlow event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {selectedEvent?.kind === 'raffle' && <RaffleReservationFlow event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </main>
  )
}
