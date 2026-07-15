import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Action,
  CompactCard,
  ExpandedCardDialog,
  Icon,
} from '@abrigo/shared'
import { Tag } from '../components/Tag'
import dogPhoto from '../assets/landing_adote.jpg'

type Dog = {
  age: number
  description: string
  gender: 'femea' | 'macho'
  id: number
  name: string
  size: 'grande' | 'medio' | 'pequeno'
}

type FilterSelectProps = {
  children: ReactNode
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}

const GOOGLE_FORM_URL = 'https://forms.gle/nLSjXJyeLGUJXZj27'
const DESCRIPTION =
  'Aqui vem o começo do texto descrevendo um cão ou um produto, depende do contexto'
const FULL_DESCRIPTION =
  'Aqui vem o texto completo, descrevendo o cão com mais detalhes: temperamento, histórico de resgate e cuidados necessários — até que o conteúdo real de cada animal esteja cadastrado.'

const DOGS: Dog[] = [
  { id: 1, name: 'Negão', gender: 'macho', size: 'grande', age: 7, description: DESCRIPTION },
  { id: 2, name: 'Dentinho', gender: 'macho', size: 'medio', age: 4, description: DESCRIPTION },
  { id: 3, name: 'Doguinho', gender: 'macho', size: 'pequeno', age: 2, description: DESCRIPTION },
  { id: 4, name: 'Doguinho', gender: 'macho', size: 'medio', age: 5, description: DESCRIPTION },
  { id: 5, name: 'Negão', gender: 'macho', size: 'grande', age: 8, description: DESCRIPTION },
  { id: 6, name: 'Dentinho', gender: 'femea', size: 'pequeno', age: 3, description: DESCRIPTION },
]

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
  return [GENDER_LABELS[dog.gender], SIZE_LABELS[dog.size], `${dog.age} ANOS`]
}

function FilterSelect({ children, id, label, onChange, value }: FilterSelectProps) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-4 lg:block">
      <label htmlFor={id} className="text-lg font-medium lg:block lg:text-center">
        {label}
      </label>
      <div className="relative lg:mt-1">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-10 w-full appearance-none rounded-full bg-marca-escura px-5 py-2 text-center text-base font-medium text-marca-clara outline-none focus-visible:ring-2 focus-visible:ring-marca-clara dark:bg-marca"
        >
          {children}
        </select>
        <Icon
          name="arrow-separate-vertical"
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-marca-clara"
        />
      </div>
    </div>
  )
}

export function Adocao() {
  const [gender, setGender] = useState('')
  const [size, setSize] = useState('')
  const [order, setOrder] = useState('')
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null)

  const dogs = useMemo(() => {
    const filtered = DOGS.filter(
      (dog) => (!gender || dog.gender === gender) && (!size || dog.size === size),
    )

    return [...filtered].sort((a, b) => {
      if (order === 'age-asc') return a.age - b.age
      if (order === 'age-desc') return b.age - a.age
      if (order === 'name') return a.name.localeCompare(b.name, 'pt-BR')
      return a.id - b.id
    })
  }, [gender, order, size])

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
            <FilterSelect id="gender" label="Gênero" value={gender} onChange={setGender}>
              <option value="">Selecionar</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </FilterSelect>
            <FilterSelect id="size" label="Porte" value={size} onChange={setSize}>
              <option value="">Selecionar</option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </FilterSelect>
            <FilterSelect id="order" label="Ordenar" value={order} onChange={setOrder}>
              <option value="">Selecionar</option>
              <option value="age-asc">Mais novos</option>
              <option value="age-desc">Mais velhos</option>
              <option value="name">Nome</option>
            </FilterSelect>
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

        <section aria-label="Cães disponíveis" className="mt-10 grid grid-cols-2 gap-5 lg:mt-10 lg:grid-cols-3 lg:gap-6">
          {dogs.map((dog) => {
            const tags = getDogTags(dog)

            return (
              <CompactCard
                key={dog.id}
                actionArea="card"
                className="min-w-0"
                image={{ src: dogPhoto, alt: dog.name }}
                title={dog.name}
                description={dog.description}
                tags={tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}
                action={
                  <Action
                    onClick={() => setSelectedDog(dog)}
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

        {dogs.length === 0 && (
          <p className="mt-10 text-center text-2xl">Nenhum cão encontrado.</p>
        )}
      </div>

      {selectedDog && (
        <ExpandedCardDialog
          title={selectedDog.name}
          description={FULL_DESCRIPTION}
          tags={getDogTags(selectedDog).map((tag) => (
            <Tag key={tag} size="dialog" variant="dialog">{tag}</Tag>
          ))}
          images={[dogPhoto, dogPhoto, dogPhoto]}
          primaryAction={{ label: 'Adote-me', href: GOOGLE_FORM_URL }}
          onClose={() => setSelectedDog(null)}
          variant="adoption"
        />
      )}
    </main>
  )
}
