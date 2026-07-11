import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, BlobImage } from '@abrigo/shared'
import { PreviewModal } from './PreviewModal'
import adotePhoto from '../assets/landing_adote.jpg'

type DogPreview = {
  name: string
  description: string
  fullDescription: string
}

const TAGS = ['MODELO TAG', 'MODELO TAG', 'MODELO TAG']
const GOOGLE_FORM_URL = 'https://forms.gle/nLSjXJyeLGUJXZj27'

const FULL_DESCRIPTION =
  'Aqui vem o texto completo, descrevendo o cão com mais detalhes: temperamento, histórico de resgate e cuidados necessários — até que o conteúdo real de cada animal esteja cadastrado.'

const DOGS: DogPreview[] = [
  {
    name: 'Negão',
    description:
      'Aqui vem o começo do texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
  {
    name: 'Dentinho',
    description:
      'Aqui vem o começo do texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
  {
    name: 'Dentinho',
    description:
      'Aqui vem o começo do texto descrevendo um cão ou um produto, depende do contexto',
    fullDescription: FULL_DESCRIPTION,
  },
]

export function AdocaoPreview() {
  const [selectedDog, setSelectedDog] = useState<number | null>(null)

  return (
    <section className="bg-cinza-escuro dark:bg-cinza-claro">
      <div className="mx-auto grid max-w-[1920px] gap-8 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-x-12 lg:py-24">
        <div>
          <h2 className="text-5xl leading-tight font-medium text-marca lg:text-8xl">
            Adote um amigo
          </h2>

          <BlobImage
            src={adotePhoto}
            alt="Cão resgatado recebendo carinho"
            className="mx-auto my-8 w-full max-w-md lg:hidden"
          />

          <p className="max-w-4xl text-2xl text-cinza-claro dark:text-cinza-escuro">
            Nossos cães estão em busca de um lar cheio de amor e carinho!
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
            {DOGS.map((dog, index) => (
              <div
                key={index}
                className="flex flex-col overflow-hidden rounded-2xl bg-cinza-medio dark:bg-white"
              >
                <img
                  src={adotePhoto}
                  alt={dog.name}
                  className="aspect-square w-full object-cover"
                />

                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex flex-wrap gap-1">
                    {TAGS.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="rounded-full bg-marca-escura px-2 py-0.5 text-tag font-medium text-marca-clara"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="font-medium text-marca">{dog.name}</p>

                  <p className="text-sm text-cinza-claro dark:text-cinza-escuro">
                    {dog.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedDog(index)}
                    className="mt-auto rounded-full bg-marca px-4 py-2 text-center text-sm font-medium text-marca-clara"
                  >
                    Ler mais
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/adocao"
            className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-marca px-6 py-2 font-medium text-marca-clara"
          >
            <Icon name="wolf-solid" className="h-5 w-5" />
            Ver todos os cães
          </Link>
        </div>

        <BlobImage
          src={adotePhoto}
          alt="Cão resgatado recebendo carinho"
          className="hidden w-full lg:order-first lg:block"
        />
      </div>

      {selectedDog !== null && (
        <PreviewModal
          name={DOGS[selectedDog].name}
          description={DOGS[selectedDog].fullDescription}
          tags={TAGS}
          image={adotePhoto}
          primaryAction={{ label: 'Adote-me', href: GOOGLE_FORM_URL }}
          onClose={() => setSelectedDog(null)}
        />
      )}
    </section>
  )
}
