import { useState } from 'react'
import {
  Action,
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

      <div className="mt-8 grid grid-cols-2 gap-4 lg:auto-rows-fr lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {stories.slice(0, 3).map((story) => (
          <CompactCard
            key={story.id}
            className="lg:min-h-[22rem]"
            image={{ src: getStoryPhotoUrl(story.photos[0]), alt: story.name }}
            title={story.name}
            description={story.description}
            action={
              <Action
                onClick={() => setSelectedStoryId(story.id)}
                size="compact"
                className="w-full whitespace-normal px-3 leading-tight"
              >
                Conheça essa história
              </Action>
            }
          />
        ))}
      </div>

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
