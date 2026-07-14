import { useState } from 'react'
import { Action, CompactCard, ExpandedCardDialog, FeatureSection } from '@abrigo/shared'
import historiasPhoto from '../assets/landing_historias.jpg'

type StoryPreview = {
  name: string
  description: string
  fullDescription: string
}

const FULL_DESCRIPTION =
  'Aqui vem o texto completo, contando a história desde o resgate até a adoção — até que o conteúdo real de cada história esteja cadastrado.'

const STORIES: StoryPreview[] = [
  {
    name: 'Maia',
    description:
      'Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
  {
    name: 'Clarinha',
    description:
      'Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
  {
    name: 'Maia',
    description:
      'Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
]

export function HistoriasPreview() {
  const [selectedStory, setSelectedStory] = useState<number | null>(null)

  return (
    <FeatureSection
      image={{ src: historiasPhoto, alt: 'Cão adotado recebendo carinho' }}
      heading={
        <h2 className="text-5xl leading-tight font-medium text-marca-escura dark:text-marca-clara lg:text-8xl">
          O final feliz que
          <br />
          todos merecem
        </h2>
      }
      after={
        selectedStory !== null && (
          <ExpandedCardDialog
            title={STORIES[selectedStory].name}
            description={STORIES[selectedStory].fullDescription}
            images={[historiasPhoto]}
            onClose={() => setSelectedStory(null)}
          />
        )
      }
    >
      <p className="max-w-4xl text-2xl">
        No Abrigo da Márcia, nos dedicamos a cuidar e alimentar cães em
        situação de vulnerabilidade, oferecendo a eles um lar temporário seguro
        e cheio de amor.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {STORIES.map((story, index) => (
          <CompactCard
            key={index}
            image={{ src: historiasPhoto, alt: story.name }}
            title={story.name}
            description={story.description}
            action={
              <Action onClick={() => setSelectedStory(index)} size="compact">
                Conheça essa história
              </Action>
            }
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Action to="/historias" icon="open-book" variant="secondary">
          Ver todas as histórias
        </Action>
      </div>
    </FeatureSection>
  )
}
