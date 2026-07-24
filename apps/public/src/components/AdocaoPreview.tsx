import { useState } from 'react'
import {
  Action,
  CompactCard,
  ExpandedCardDialog,
  FeatureSection,
  getDogPhotoUrl,
  usePublicDogs,
  usePublicSiteSettings,
} from '@abrigo/shared'
import type { Dog } from '@abrigo/shared'
import { Tag } from './Tag'
import adotePhoto from '../assets/landing_adote.jpg'

const CURRENT_YEAR = new Date().getFullYear()
const GENDER_LABELS: Record<Dog['gender'], string> = {
  femea: 'FÊMEA',
  macho: 'MACHO',
}
const SIZE_LABELS: Record<Dog['size'], string> = {
  grande: 'GRANDE',
  medio: 'MÉDIO',
  pequeno: 'PEQUENO',
}

function getDogTags(dog: Dog) {
  return [
    GENDER_LABELS[dog.gender],
    SIZE_LABELS[dog.size],
    `${CURRENT_YEAR - dog.birthYear} ANOS`,
  ]
}

export function AdocaoPreview() {
  const { data: availableDogs = [], isLoading, error } = usePublicDogs()
  const { data: siteSettings } = usePublicSiteSettings()
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null)
  const selectedDog = availableDogs.find((dog) => dog.id === selectedDogId) ?? null
  const dogs = availableDogs.slice(0, 3)

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
        selectedDog && (
          <ExpandedCardDialog
            title={selectedDog.name}
            description={selectedDog.description}
            tags={getDogTags(selectedDog).map((tag) => (
              <Tag key={tag} size="md">
                {tag}
              </Tag>
            ))}
            images={selectedDog.photos.map(getDogPhotoUrl)}
            expandableImages
            primaryAction={siteSettings ? { label: 'Adote-me', href: selectedDog.adoptionFormUrl || siteSettings.adoptionFormUrl } : undefined}
            onClose={() => setSelectedDogId(null)}
            variant="adoption"
          />
        )
      }
    >
      <p className="max-w-4xl text-2xl">
        Nossos cães estão em busca de um lar cheio de amor e carinho!
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {dogs.map((dog) => {
          const cover = dog.photos[0]
          return (
            <CompactCard
              key={dog.id}
              image={cover ? { src: getDogPhotoUrl(cover), alt: dog.name } : undefined}
              title={dog.name}
              description={dog.description}
              tags={getDogTags(dog).map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
              action={
                <Action onClick={() => setSelectedDogId(dog.id)} size="compact">
                  Ler mais
                </Action>
              }
            />
          )
        })}
      </div>

      {isLoading && <p role="status" className="mt-8 text-center">Carregando cães...</p>}
      {error && <p role="alert" className="mt-8 text-center">Não foi possível carregar os cães.</p>}

      <div className="mt-8 flex justify-center">
        <Action to="/adocao" icon="wolf-solid">
          Ver todos os cães
        </Action>
      </div>
    </FeatureSection>
  )
}
