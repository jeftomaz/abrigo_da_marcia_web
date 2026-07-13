import { Action, CompactCard, FeatureSection } from '@abrigo/shared'
import eventosPhoto from '../assets/landing_eventos.jpg'

export function RecaopensaPreview() {
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

      <CompactCard
        className="mt-12"
        orientation="horizontal"
        image={{ src: eventosPhoto, alt: 'Camiseta Copa 2026' }}
        title="Camiseta Copa 2026"
        description="Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto. Pode ser possível encaixar mais, devido ao formato horizontal."
        action={
          <Action to="/eventos" size="compact">
            Reserve a sua
          </Action>
        }
      />

      <div className="mt-20 flex justify-center">
        <Action to="/eventos" icon="calendar">
          Conheça os eventos
        </Action>
      </div>
    </FeatureSection>
  )
}
