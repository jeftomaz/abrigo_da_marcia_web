import { useMemo, useState } from 'react'
import {
  Action,
  CompactCard,
  ExpandedCardDialog,
  SelectField,
  getDogPhotoUrl,
  usePublicDogs,
} from '@abrigo/shared'
import type { Dog } from '@abrigo/shared'
import { Tag } from '../components/Tag'

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

const ORDER_LABELS: Record<string, string> = {
  'age-asc': 'Mais novos',
  'age-desc': 'Mais velhos',
  name: 'Nome',
}

function getDogTags(dog: Dog) {
  return [
    GENDER_LABELS[dog.gender],
    SIZE_LABELS[dog.size],
    `${CURRENT_YEAR - dog.birthYear} ANOS`,
  ]
}

export function Adocao() {
  const { data: availableDogs = [], isLoading, error } = usePublicDogs()
  const [gender, setGender] = useState('')
  const [size, setSize] = useState('')
  const [order, setOrder] = useState('')
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null)
  const selectedDog = availableDogs.find((dog) => dog.id === selectedDogId) ?? null

  const dogs = useMemo(() => {
    const filtered = availableDogs.filter(
      (dog) => (!gender || dog.gender === gender) && (!size || dog.size === size),
    )

    return [...filtered].sort((a, b) => {
      const aAge = CURRENT_YEAR - a.birthYear
      const bAge = CURRENT_YEAR - b.birthYear
      if (order === 'age-asc') return aAge - bAge
      if (order === 'age-desc') return bAge - aAge
      if (order === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return 0
    })
  }, [availableDogs, gender, order, size])

  const clearFilters = () => {
    setGender('')
    setSize('')
    setOrder('')
  }

  const activeFilters = [
    gender ? `Gênero: ${GENDER_LABELS[gender as Dog['gender']]}` : null,
    size ? `Porte: ${SIZE_LABELS[size as Dog['size']]}` : null,
    order ? `Ordem: ${ORDER_LABELS[order]}` : null,
  ].filter((filter): filter is string => filter !== null)

  return (
    <main className="min-h-screen bg-cinza-claro px-10 pt-10 pb-20 text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro lg:px-6 lg:pt-4">
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <h1 className="text-5xl leading-tight font-medium text-marca lg:text-8xl">
            Adote um amigo
          </h1>
          <p className="mt-4 text-2xl font-medium lg:mt-2">
            Conheça os cães que estão esperando por um novo lar.
          </p>
        </header>

        <section
          aria-label="Filtros dos cães"
          className="mt-6 rounded-3xl bg-surface-raised p-6 text-on-surface-raised lg:mt-5 lg:p-4"
        >
          <div className="grid gap-4 lg:grid-cols-3 lg:gap-10">
            <SelectField id="gender" label="Gênero" value={gender} onChange={setGender} variant="filter">
              <option value="">Selecionar</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </SelectField>
            <SelectField id="size" label="Porte" value={size} onChange={setSize} variant="filter">
              <option value="">Selecionar</option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </SelectField>
            <SelectField id="order" label="Ordenar" value={order} onChange={setOrder} variant="filter">
              <option value="">Selecionar</option>
              <option value="age-asc">Mais novos</option>
              <option value="age-desc">Mais velhos</option>
              <option value="name">Nome</option>
            </SelectField>
          </div>
          <div className="mt-5 flex justify-center lg:justify-end">
            <Action
              onClick={clearFilters}
              variant="secondary-adaptive"
              size="small"
              icon="refresh-circle"
              disabled={activeFilters.length === 0}
            >
              Limpar filtros
            </Action>
          </div>
        </section>

        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm"
          aria-live="polite"
        >
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="rounded-full bg-marca-escura px-3 py-1 font-medium text-marca-clara dark:bg-marca"
              >
                {filter}
              </span>
            ))}
          </div>
          <p className="ml-auto font-medium">
            {dogs.length} {dogs.length === 1 ? 'cão encontrado' : 'cães encontrados'}
          </p>
        </div>

        {isLoading && <p className="mt-10 text-center text-2xl">Carregando cães...</p>}
        {error && (
          <p role="alert" className="mt-10 text-center text-2xl">
            Não foi possível carregar os cães.
          </p>
        )}

        <section aria-label="Cães disponíveis" className="mt-10 grid grid-cols-2 gap-5 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          {dogs.map((dog) => {
            const tags = getDogTags(dog)
            const cover = dog.photos[0]

            return (
              <CompactCard
                key={dog.id}
                className="min-w-0"
                image={cover ? { src: getDogPhotoUrl(cover), alt: dog.name } : undefined}
                title={dog.name}
                description={dog.description}
                tags={tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                action={
                  <Action
                    onClick={() => setSelectedDogId(dog.id)}
                    size="compact"
                    className="px-2"
                    aria-label={`Conhecer ${dog.name}`}
                  >
                    <span className="lg:hidden">Conhecer cão</span>
                    <span className="hidden lg:inline">Ler mais</span>
                  </Action>
                }
              />
            )
          })}
        </section>

        {!isLoading && !error && dogs.length === 0 && (
          <p className="mt-10 text-center text-2xl">Nenhum cão encontrado.</p>
        )}
      </div>

      {selectedDog && (
        <ExpandedCardDialog
          title={selectedDog.name}
          description={selectedDog.description}
          tags={getDogTags(selectedDog).map((tag) => (
            <Tag key={tag} size="dialog" variant="dialog">{tag}</Tag>
          ))}
          images={selectedDog.photos.map(getDogPhotoUrl)}
          expandableImages
          primaryAction={{ label: 'Adote-me', href: selectedDog.adoptionFormUrl }}
          onClose={() => setSelectedDogId(null)}
          variant="adoption"
        />
      )}
    </main>
  )
}
