import { useState } from 'react'
import { Action, CompactCard, ExpandedCardDialog, FeatureSection } from '@abrigo/shared'
import { STORIES } from '../data/stories'

export function HistoriasPreview() {
  const [selectedStory, setSelectedStory] = useState<number | null>(null)

  return (
    <FeatureSection
      image={{ src: STORIES[0].photos[0], alt: 'Cão adotado recebendo carinho' }}
      heading={
        <h2 className="text-5xl leading-tight font-medium lg:text-8xl">
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
            images={STORIES[selectedStory].photos}
            onClose={() => setSelectedStory(null)}
            variant="story"
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
        {STORIES.slice(0, 3).map((story, index) => (
          <CompactCard
            key={story.id}
            actionArea="card"
            image={{ src: story.photos[0], alt: story.name }}
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
