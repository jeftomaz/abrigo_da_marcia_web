import { useState } from 'react'
import {
  Action,
  CardGrid,
  CompactCard,
  ExpandedCardDialog,
  FeatureSection,
  getStoryPhotoUrl,
  usePublicStories,
} from '@abrigo/shared'
import historiasPhoto from '../assets/landing_historias.jpg'

export function HistoriasPreview() {
  const { data: stories = [], isLoading, error } = usePublicStories()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null

  return (
    <FeatureSection
      image={{ src: historiasPhoto, alt: 'Cão adotado recebendo carinho' }}
      heading={
        <h2 className="text-5xl leading-tight font-medium lg:text-8xl">
          O final feliz que
          <br />
          todos merecem
        </h2>
      }
      after={
        selectedStory && (
          <ExpandedCardDialog
            title={selectedStory.name}
            description={selectedStory.description}
            images={selectedStory.photos.map(getStoryPhotoUrl)}
            expandableImages
            onClose={() => setSelectedStoryId(null)}
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

      <CardGrid label="Histórias de adoção em destaque" variant="preview">
        {stories.slice(0, 3).map((story) => (
          <CompactCard
            key={story.id}
            image={{ src: getStoryPhotoUrl(story.photos[0]), alt: story.name }}
            title={story.name}
            description={story.description}
            action={
              <Action
                onClick={() => setSelectedStoryId(story.id)}
                size="compact"
              >
                Conheça essa história
              </Action>
            }
          />
        ))}
      </CardGrid>

      {isLoading && <p role="status" className="mt-8 text-center">Carregando histórias...</p>}
      {error && (
        <p role="alert" className="mt-8 text-center">
          Não foi possível carregar as histórias.
        </p>
      )}

      <div className="mt-8 flex justify-center">
        <Action to="/historias" icon="open-book" variant="secondary-adaptive">
          Ver todas as histórias
        </Action>
      </div>
    </FeatureSection>
  )
}
