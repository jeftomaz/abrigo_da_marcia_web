import { useState } from 'react'
import { Action, CompactCard, ExpandedCardDialog, FeatureSection } from '@abrigo/shared'
import { Tag } from './Tag'
import adotePhoto from '../assets/landing_adote.jpg'

type DogPreview = {
  name: string
  description: string
  fullDescription: string
}

const TAGS = ['MACHO', 'GRANDE', '7 ANOS']
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
    <FeatureSection
      tone="contrast"
      image={{ src: adotePhoto, alt: 'Cão resgatado recebendo carinho' }}
      imagePosition="start"
      heading={
        <h2 className="text-5xl leading-tight font-medium text-marca lg:text-8xl">
          Adote um amigo
        </h2>
      }
      after={
        selectedDog !== null && (
          <ExpandedCardDialog
            title={DOGS[selectedDog].name}
            description={DOGS[selectedDog].fullDescription}
            tags={TAGS.map((tag, index) => (
              <Tag key={index} size="md">
                {tag}
              </Tag>
            ))}
            images={[adotePhoto]}
            primaryAction={{ label: 'Adote-me', href: GOOGLE_FORM_URL }}
            onClose={() => setSelectedDog(null)}
          />
        )
      }
    >
      <p className="max-w-4xl text-2xl">
        Nossos cães estão em busca de um lar cheio de amor e carinho!
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {DOGS.map((dog, index) => (
          <CompactCard
            key={index}
            image={{ src: adotePhoto, alt: dog.name }}
            title={dog.name}
            description={dog.description}
            tags={TAGS.map((tag, tagIndex) => (
              <Tag key={tagIndex}>{tag}</Tag>
            ))}
            action={
              <Action onClick={() => setSelectedDog(index)} size="compact">
                Ler mais
              </Action>
            }
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Action to="/adocao" icon="wolf-solid">
          Ver todos os cães
        </Action>
      </div>
    </FeatureSection>
  )
}
