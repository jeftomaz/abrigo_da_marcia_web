import { useState } from 'react'
import { Action, CompactCard, ExpandedCardDialog } from '@abrigo/shared'
import { STORIES, type Story } from '../data/stories'

export function Historias() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

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

        <section
          aria-label="Histórias de adoção"
          className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-3 lg:gap-6"
        >
          {STORIES.map((story) => (
            <CompactCard
              key={story.id}
              actionArea="card"
              image={{ src: story.photos[0], alt: `Cão adotado: ${story.name}` }}
              imageAspect="landscape"
              title={story.name}
              description={story.description}
              action={
                <Action
                  onClick={() => setSelectedStory(story)}
                  size="small"
                  className="px-1"
                  aria-label={`Conhecer a história de ${story.name}`}
                >
                  Conheça essa história
                </Action>
              }
            />
          ))}
        </section>
      </div>

      {selectedStory && (
        <ExpandedCardDialog
          title={selectedStory.name}
          description={selectedStory.fullDescription}
          images={selectedStory.photos}
          onClose={() => setSelectedStory(null)}
          variant="story"
        />
      )}
    </main>
  )
}
