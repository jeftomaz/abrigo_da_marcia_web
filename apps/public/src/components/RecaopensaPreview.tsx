import {
  Action,
  CompactCard,
  FeatureSection,
  getEventPhotoUrl,
  usePublicEvents,
} from '@abrigo/shared'
import eventosPhoto from '../assets/landing_eventos.jpg'

export function RecaopensaPreview() {
  const { data: events = [], isLoading, error } = usePublicEvents()
  const activeEvent = events.find((event) => event.status === 'active')
  const activeEventPhoto = activeEvent?.gallery[0]

  return (
    <FeatureSection
      tone="contrast"
      image={{
        src: eventosPhoto,
        alt: 'Banner do evento de arrecadação do abrigo',
      }}
      imagePosition="start"
      contentClassName="mb-12"
      heading={
        <h2 className="text-5xl leading-tight font-medium text-marca lg:text-8xl">
          Doar <em className="italic">Recãopensa</em>
        </h2>
      }
    >
      <p className="max-w-4xl text-2xl">
        O abrigo sobrevive graças aos apoiadores que acreditam na nossa causa.
        Porém nem sempre isso é suficiente. Pensando nisso, o abrigo realiza,
        de tempos em tempos, eventos de arrecadação, como rifas e produtos
        personalizados.
      </p>

      {activeEvent && (
        <CompactCard
          className="mt-12"
          orientation="horizontal"
          image={activeEventPhoto
            ? { src: getEventPhotoUrl(activeEventPhoto), alt: activeEvent.title }
            : undefined}
          title={activeEvent.title}
          description={activeEvent.description}
          action={
            <Action to="/eventos" size="compact">
              Quero participar
            </Action>
          }
        />
      )}

      {isLoading && <p role="status" className="mt-8 text-center">Carregando evento...</p>}
      {error && <p role="alert" className="mt-8 text-center">Não foi possível carregar o evento.</p>}

      <div className="mt-20 flex justify-center">
        <Action to="/eventos" icon="calendar">
          Conheça os eventos
        </Action>
      </div>
    </FeatureSection>
  )
}
