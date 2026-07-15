import { useState } from 'react'
import { Action, CompactCard } from '@abrigo/shared'
import camisetaPhoto from '../assets/evento_camiseta.jpg'
import rifaPhoto from '../assets/evento_rifa.jpg'
import { ProductReservationFlow } from '../components/ProductReservationFlow'
import { RaffleReservationFlow } from '../components/RaffleReservationFlow'

type FundraisingEvent = {
  actionLabel: string
  description: string
  id: number
  image: string
  reservationKind?: 'product' | 'raffle'
  prize?: string
  title: string
  winner?: string
}

const DESCRIPTION =
  'Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto. Pode ser possível encaixar mais, devido ao formato horizontal.'
const FULL_DESCRIPTION =
  'Aqui vem o texto mais completo, descrevendo um produto ou qualquer outro objeto. Esta versão aproveita melhor o espaço da tela e apresenta as informações necessárias para a reserva. Escolha as características desejadas e adicione o produto antes de finalizar.'
const FULL_RAFFLE_DESCRIPTION =
  'Aqui vem o texto mais completo, descrevendo a rifa e o prêmio. Escolha entre os números disponíveis para montar sua reserva. Os números marcados como reservados não podem ser selecionados e voltam a ficar disponíveis caso o pagamento não seja confirmado dentro do prazo.'

const ACTIVE_EVENT: FundraisingEvent = {
  id: 1,
  title: 'Camiseta Copa 2026',
  description: DESCRIPTION,
  image: camisetaPhoto,
  actionLabel: 'Reserve a sua',
  reservationKind: 'product',
}

const PAST_EVENTS: FundraisingEvent[] = [
  {
    id: 2,
    title: 'Rifa de Páscoa',
    description: DESCRIPTION,
    image: rifaPhoto,
    actionLabel: 'Conheça o evento',
    reservationKind: 'raffle',
    prize: 'Cesta de Páscoa',
    winner: 'a ser anunciado',
  },
  {
    id: 3,
    title: 'Sorvetes de Março',
    description: DESCRIPTION,
    image: rifaPhoto,
    actionLabel: 'Conheça o evento',
  },
]

function EventCard({
  event,
  active = false,
  onOpen,
}: {
  event: FundraisingEvent
  active?: boolean
  onOpen?: () => void
}) {
  return (
    <CompactCard
      orientation="responsive"
      imageAspect="landscape"
      image={{ src: event.image, alt: event.title }}
      title={event.title}
      description={event.description}
      action={
        <Action
          onClick={onOpen}
          size="compact"
          variant={active ? 'primary' : 'secondary'}
          className={active ? '' : 'dark:bg-marca-escura dark:text-marca'}
          aria-label={`${event.actionLabel}: ${event.title}`}
        >
          {event.actionLabel}
        </Action>
      }
    />
  )
}

export function Eventos() {
  const [selectedEvent, setSelectedEvent] = useState<FundraisingEvent | null>(null)

  return (
    <main className="min-h-screen bg-cinza-claro px-10 pt-10 pb-20 text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro lg:px-6 lg:pt-4">
      <div className="mx-auto max-w-4xl">
        <header className="text-left lg:text-center">
          <h1 className="text-5xl leading-tight font-medium text-marca lg:text-6xl">
            Cada evento, uma lembrança
          </h1>
          <p className="mt-6 text-2xl font-medium lg:mt-3">
            Veja os eventos de arrecadação e ajude o abrigo
          </p>
        </header>

        <section aria-labelledby="active-event-title" className="mx-auto mt-10 max-w-2xl">
          <h2 id="active-event-title" className="text-4xl font-medium text-marca">
            Evento Ativo
          </h2>
          <div className="mx-auto mt-6 w-4/5 lg:w-full">
            <EventCard event={ACTIVE_EVENT} active onOpen={() => setSelectedEvent(ACTIVE_EVENT)} />
          </div>
        </section>

        <section aria-labelledby="past-events-title" className="mx-auto mt-20 max-w-2xl">
          <h2 id="past-events-title" className="text-4xl font-medium">
            Eventos Passados
          </h2>
          <div className="mx-auto mt-6 w-4/5 space-y-12 lg:w-full">
            {PAST_EVENTS.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onOpen={event.reservationKind ? () => setSelectedEvent(event) : undefined}
              />
            ))}
          </div>
        </section>
      </div>

      {selectedEvent?.reservationKind === 'product' && (
        <ProductReservationFlow
          title={selectedEvent.title}
          description={FULL_DESCRIPTION}
          image={selectedEvent.image}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedEvent?.reservationKind === 'raffle' && (
        <RaffleReservationFlow
          title={selectedEvent.title}
          description={FULL_RAFFLE_DESCRIPTION}
          image={selectedEvent.image}
          prize={selectedEvent.prize ?? ''}
          winner={selectedEvent.winner ?? ''}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </main>
  )
}
