import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, BlobImage } from '@abrigo/shared'
import { PreviewModal } from './PreviewModal'
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
    <section className="bg-marca">
      <div className="mx-auto grid max-w-[1920px] gap-8 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-x-12 lg:py-24">
        <div>
          <h2 className="text-5xl leading-tight font-medium text-marca-escura dark:text-marca-clara lg:text-8xl">
            O final feliz que
            <br />
            todos merecem
          </h2>

          <BlobImage
            src={historiasPhoto}
            alt="Cão adotado recebendo carinho"
            className="mx-auto my-8 w-full max-w-md lg:hidden"
          />

          <p className="max-w-4xl text-2xl text-marca-escura dark:text-marca-clara">
            No Abrigo da Márcia, nos dedicamos a cuidar e alimentar cães em
            situação de vulnerabilidade, oferecendo a eles um lar temporário
            seguro e cheio de amor.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {STORIES.map((story, index) => (
              <div
                key={index}
                className="flex flex-col overflow-hidden rounded-2xl bg-cinza-escuro dark:bg-white"
              >
                <img
                  src={historiasPhoto}
                  alt={story.name}
                  className="aspect-square w-full object-cover"
                />

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="font-medium text-marca">{story.name}</p>

                  <p className="text-sm text-cinza-claro dark:text-cinza-escuro">
                    {story.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedStory(index)}
                    className="mt-auto rounded-full bg-marca px-4 py-2 text-center text-sm font-medium text-marca-clara"
                  >
                    Conheça essa história
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/historias"
            className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-marca px-6 py-2 font-medium text-marca-clara"
          >
            <Icon name="open-book" className="h-5 w-5" />
            Ver todas as histórias
          </Link>
        </div>

        <BlobImage
          src={historiasPhoto}
          alt="Cão adotado recebendo carinho"
          className="hidden w-full lg:block"
        />
      </div>

      {selectedStory !== null && (
        <PreviewModal
          name={STORIES[selectedStory].name}
          description={STORIES[selectedStory].fullDescription}
          image={historiasPhoto}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </section>
  )
}
