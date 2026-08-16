import { useState } from 'react'
import {
  Action,
  CardGrid,
  CompactCard,
  ExpandedCardDialog,
  getStoryPhotoUrl,
  usePublicStories,
} from '@abrigo/shared'

export function Historias() {
  const { data: stories = [], isLoading, error } = usePublicStories()
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null)
  const selectedStory = stories.find((story) => story.id === selectedStoryId) ?? null

  return (
    <main className="min-h-screen bg-marca px-10 pt-10 pb-20 text-on-brand lg:px-6 lg:pt-4">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <h1 className="text-5xl leading-tight font-medium lg:text-8xl">
            Os finais felizes
          </h1>
          <p className="mt-4 text-2xl font-medium lg:mt-2">
            Conheça as histórias que fazem tudo valer a pena.
          </p>
        </header>

        {!isLoading && !error && stories.length > 0 && (
          <CardGrid label="Histórias de adoção">
            {stories.map((story) => (
              <CompactCard
                key={story.id}
                image={{
                  src: getStoryPhotoUrl(story.photos[0]),
                  alt: `Cão adotado: ${story.name}`,
                }}
                imageAspect="landscape"
                title={story.name}
                description={story.description}
                action={
                  <Action
                    onClick={() => setSelectedStoryId(story.id)}
                    size="card"
                    aria-label={`Conhecer a história de ${story.name}`}
                  >
                    Ler história
                  </Action>
                }
              />
            ))}
          </CardGrid>
        )}

        {isLoading && <p role="status" className="mt-10 text-center text-2xl">Carregando histórias...</p>}
        {error && (
          <p role="alert" className="mt-10 text-center text-2xl">
            Não foi possível carregar as histórias.
          </p>
        )}
        {!isLoading && !error && stories.length === 0 && (
          <p className="mt-10 text-center text-2xl">Nenhuma história publicada.</p>
        )}
      </div>

      {selectedStory && (
        <ExpandedCardDialog
          title={selectedStory.name}
          description={selectedStory.description}
          images={selectedStory.photos.map(getStoryPhotoUrl)}
          expandableImages
          onClose={() => setSelectedStoryId(null)}
          variant="story"
        />
      )}
    </main>
  )
}
