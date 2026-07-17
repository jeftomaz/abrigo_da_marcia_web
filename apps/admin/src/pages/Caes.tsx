import { useEffect, useMemo, useState } from 'react'
import { Action, Dialog, Icon } from '@abrigo/shared'
import { DogForm } from '../components/DogForm'
import { DogRow } from '../components/DogRow'
import { StatCards } from '../components/StatCards'
import { SEED_DOGS, type Dog, type DogStatus } from '../data/dogs'

// Só dois estados: desktop (painel lateral) e mobile (modal). O limiar (85rem,
// alinhado ao breakpoint `desk`) é onde as três colunas cabem sem se espremer.
const DESKTOP_QUERY = '(min-width: 1360px)'

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY)
    const handleChange = () => setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

export function Caes() {
  const [dogs, setDogs] = useState(SEED_DOGS)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DogStatus | ''>('')
  const [editingTarget, setEditingTarget] = useState<Dog | null | undefined>(undefined)
  const isDesktop = useIsDesktop()
  const isEditing = editingTarget !== undefined

  const filteredDogs = useMemo(
    () =>
      dogs.filter(
        (dog) =>
          (!search || dog.name.toLowerCase().includes(search.toLowerCase())) &&
          (!statusFilter || dog.status === statusFilter),
      ),
    [dogs, search, statusFilter],
  )

  const stats = useMemo(
    () => ({
      total: dogs.length,
      disponiveis: dogs.filter((dog) => dog.status === 'disponivel').length,
      adotados: dogs.filter((dog) => dog.status === 'adotado').length,
      falecidos: dogs.filter((dog) => dog.status === 'falecido').length,
    }),
    [dogs],
  )

  const handleSave = (dog: Dog) => {
    setDogs((current) =>
      current.some((item) => item.id === dog.id)
        ? current.map((item) => (item.id === dog.id ? dog : item))
        : [dog, ...current],
    )
    setEditingTarget(undefined)
  }

  const handleRemove = (dog: Dog) => {
    if (!window.confirm(`Remover ${dog.name}?`)) return
    setDogs((current) => current.filter((item) => item.id !== dog.id))
  }

  const handleSetStatus = (dog: Dog, status: DogStatus) =>
    setDogs((current) => current.map((item) => (item.id === dog.id ? { ...item, status } : item)))

  const formTitle = editingTarget ? 'Editar Cão' : 'Novo Cão'

  return (
    <main className="flex-1 overflow-x-hidden bg-white px-4 py-8 text-cinza-escuro sm:px-6 desk:bg-cinza-claro desk:py-4 dark:bg-black dark:text-cinza-claro desk:dark:bg-cinza-escuro">
      <div
        className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${
          isEditing
            ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(32rem,45rem)] desk:justify-between'
            : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'
        }`}
      >
        <StatCards {...stats} />

        <section className="flex min-w-0 flex-col gap-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 desk:gap-3">
            <h1 className="text-2xl font-medium text-marca desk:col-span-3 desk:text-3xl">Cães Cadastrados</h1>
            <div className="relative shrink-0 desk:col-start-2 desk:row-start-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as DogStatus | '')}
                aria-label="Filtrar por status"
                className="h-10 appearance-none rounded-full bg-cinza-claro pr-8 pl-3 text-sm text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca desk:bg-white dark:bg-cinza-medio dark:text-cinza-claro"
              >
                <option value="">Todos os status</option>
                <option value="disponivel">Disponível</option>
                <option value="adotado">Adotado</option>
                <option value="falecido">Falecido</option>
              </select>
              <Icon
                name="arrow-separate-vertical"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
              />
            </div>
            <Action
              onClick={() => setEditingTarget(null)}
              icon="keyframe-plus-in-solid"
              size="small"
              variant="primary-adaptive"
              className="px-4 desk:col-start-3 desk:row-start-2"
            >
              Novo Cão
            </Action>
            <div className="relative col-span-3 min-w-0 desk:col-span-1 desk:col-start-1 desk:row-start-2">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por nome, contato..."
                aria-label="Busca por nome, contato"
                className="h-10 w-full rounded-full bg-cinza-claro pr-4 pl-12 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca desk:bg-white dark:bg-cinza-medio dark:text-cinza-claro"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 rounded-3xl bg-cinza-claro p-2 desk:gap-3 desk:bg-transparent desk:p-0 dark:bg-cinza-medio desk:dark:bg-transparent">
            {filteredDogs.map((dog) => (
              <DogRow
                key={dog.id}
                dog={dog}
                onEdit={() => setEditingTarget(dog)}
                onRemove={() => handleRemove(dog)}
                onSetStatus={(status) => handleSetStatus(dog, status)}
              />
            ))}
            {filteredDogs.length === 0 && <p className="text-center">Nenhum cão encontrado.</p>}
          </div>
        </section>

        {isEditing && isDesktop && (
          <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            <DogForm
              key={editingTarget?.id ?? 'new'}
              dog={editingTarget ?? null}
              layout="panel"
              title={formTitle}
              onCancel={() => setEditingTarget(undefined)}
              onSave={handleSave}
            />
          </aside>
        )}
      </div>

      {isEditing && !isDesktop && (
        <Dialog
          ariaLabel={formTitle}
          onClose={() => setEditingTarget(undefined)}
          className="max-h-[90vh] w-full max-w-[26rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-8"
        >
          <DogForm
            key={editingTarget?.id ?? 'new'}
            dog={editingTarget ?? null}
            layout="modal"
            title={formTitle}
            onCancel={() => setEditingTarget(undefined)}
            onSave={handleSave}
          />
        </Dialog>
      )}
    </main>
  )
}
