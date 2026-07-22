import { useMemo, useState } from 'react'
import {
  Action,
  Dialog,
  Icon,
  useAdminDogs,
  useDeleteDog,
  useSaveDog,
  useUpdateDogStatus,
} from '@abrigo/shared'
import type { Dog, DogDraft, DogStatus } from '@abrigo/shared'
import { DogForm } from '../components/DogForm'
import { DogRow } from '../components/DogRow'
import { StatCards } from '../components/StatCards'
import { useIsDesktop } from '../hooks/useIsDesktop'

type StatusConfirmation = { dog: Dog; status: DogStatus }

export function Caes() {
  const { data: dogs = [], isLoading, error } = useAdminDogs()
  const saveDog = useSaveDog()
  const deleteDog = useDeleteDog()
  const updateDogStatus = useUpdateDogStatus()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DogStatus | ''>('')
  const [editingTarget, setEditingTarget] = useState<Dog | null | undefined>(undefined)
  const [statusConfirmation, setStatusConfirmation] = useState<StatusConfirmation | null>(null)
  const [deletionTarget, setDeletionTarget] = useState<Dog | null>(null)
  const [operationError, setOperationError] = useState('')
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

  const handleSave = async (dog: DogDraft) => {
    await saveDog.mutateAsync(dog)
    setEditingTarget(undefined)
  }

  const confirmDeletion = async () => {
    if (!deletionTarget) return
    setOperationError('')
    try {
      await deleteDog.mutateAsync(deletionTarget)
      setDeletionTarget(null)
    } catch {
      setOperationError('Não foi possível remover o cão.')
    }
  }

  const archiveInstead = async (status: Exclude<DogStatus, 'disponivel'>) => {
    if (!deletionTarget) return
    setOperationError('')
    try {
      await updateDogStatus.mutateAsync({ id: deletionTarget.id, status })
      setDeletionTarget(null)
    } catch {
      setOperationError('Não foi possível atualizar o status do cão.')
    }
  }

  const confirmStatusChange = async () => {
    if (!statusConfirmation) return
    setOperationError('')
    try {
      await updateDogStatus.mutateAsync({
        id: statusConfirmation.dog.id,
        status: statusConfirmation.status,
      })
      setStatusConfirmation(null)
    } catch {
      setOperationError('Não foi possível atualizar o status do cão.')
    }
  }

  const openStatusConfirmation = (dog: Dog, status: DogStatus) => {
    setOperationError('')
    setStatusConfirmation({ dog, status })
  }

  const formTitle = editingTarget ? 'Editar Cão' : 'Novo Cão'

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-3 py-4 text-cinza-escuro sm:px-6 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div
        className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-6 desk:items-start ${
          isEditing
            ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(32rem,45rem)] desk:justify-between'
            : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'
        }`}
      >
        <StatCards
          label="Total de cães"
          total={stats.total}
          items={[
            { label: 'Disponíveis', value: stats.disponiveis },
            { label: 'Adotados', value: stats.adotados },
            { label: 'Falecidos', value: stats.falecidos, className: 'col-span-2' },
          ]}
        />

        <section className="flex min-w-0 flex-col gap-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 desk:gap-3">
            <h1 className="text-2xl font-medium desk:col-span-3 desk:text-3xl desk:text-marca">
              Cães Cadastrados
            </h1>
            <div className="relative shrink-0 desk:col-start-2 desk:row-start-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as DogStatus | '')}
                aria-label="Filtrar por status"
                className="h-10 appearance-none rounded-full bg-white pr-8 pl-3 text-sm text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
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
              variant="primary"
              className="h-10 px-4 desk:col-start-3 desk:row-start-2"
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
                placeholder="Busca por nome..."
                aria-label="Busca por nome"
                className="h-10 w-full rounded-full bg-white pr-4 pl-12 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 desk:gap-3">
            {isLoading && <p role="status" className="text-center">Carregando cães...</p>}
            {error && <p role="alert" className="text-center">Não foi possível carregar os cães.</p>}
            {operationError && <p role="alert" className="text-center">{operationError}</p>}
            {filteredDogs.map((dog) => (
              <DogRow
                key={dog.id}
                dog={dog}
                isEditing={editingTarget?.id === dog.id}
                onEdit={() => setEditingTarget(dog)}
                onRemove={() => { setOperationError(''); setDeletionTarget(dog) }}
                onSetStatus={(status) => openStatusConfirmation(dog, status)}
              />
            ))}
            {!isLoading && !error && filteredDogs.length === 0 && (
              <p className="text-center">Nenhum cão encontrado.</p>
            )}
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

      {statusConfirmation && (
        <Dialog
          ariaLabel={statusConfirmation.status === 'disponivel' ? 'Retornar cão para Disponível' : `Marcar cão como ${statusConfirmation.status === 'adotado' ? 'Adotado' : 'Falecido'}`}
          onClose={() => setStatusConfirmation(null)}
          className="w-full max-w-[34rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised"
        >
          <h2 className="text-3xl font-medium text-marca">
            {statusConfirmation.status === 'disponivel'
              ? 'Retornar para Disponível'
              : `Marcar como ${statusConfirmation.status === 'adotado' ? 'Adotado' : 'Falecido'}`}
          </h2>
          <h3 className="mt-5 text-2xl font-medium">{statusConfirmation.dog.name}</h3>
          <p className="mt-3">
            {statusConfirmation.status === 'disponivel'
              ? 'O cão voltará a aparecer no catálogo público de adoção.'
              : 'O cão deixará de aparecer no catálogo público de adoção.'}
          </p>
          {operationError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{operationError}</p>}
          <div className="mt-8 flex gap-4">
            <Action
              onClick={() => setStatusConfirmation(null)}
              disabled={updateDogStatus.isPending}
              size="small"
              variant="secondary-adaptive"
              className="w-28 shrink-0"
            >
              Cancelar
            </Action>
            <Action
              onClick={() => void confirmStatusChange()}
              disabled={updateDogStatus.isPending}
              size="small"
              variant="primary-adaptive"
              className="min-w-0 flex-1"
            >
              {updateDogStatus.isPending ? 'Salvando...' : 'Confirmar alteração'}
            </Action>
          </div>
        </Dialog>
      )}

      {deletionTarget && (
        <Dialog
          ariaLabel={`Remover ${deletionTarget.name}`}
          onClose={() => setDeletionTarget(null)}
          className="w-full max-w-[36rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised"
        >
          <h2 className="text-3xl font-medium text-marca">Remover cão</h2>
          <h3 className="mt-5 text-2xl font-medium">{deletionTarget.name}</h3>
          <p className="mt-3">
            Se o cão foi adotado ou faleceu, preserve seu cadastro alterando o status. A exclusão definitiva também remove suas fotos e não pode ser desfeita.
          </p>
          {operationError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{operationError}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Action
              onClick={() => void archiveInstead('adotado')}
              disabled={deletionTarget.status === 'adotado' || updateDogStatus.isPending || deleteDog.isPending}
              size="small"
              variant="neutral-adaptive"
              icon="home-simple-door"
              className="w-full px-4"
            >
              Marcar como Adotado
            </Action>
            <Action
              onClick={() => void archiveInstead('falecido')}
              disabled={deletionTarget.status === 'falecido' || updateDogStatus.isPending || deleteDog.isPending}
              size="small"
              variant="neutral-adaptive"
              icon="eye-closed"
              className="w-full px-4"
            >
              Marcar como Falecido
            </Action>
          </div>
          <div className="mt-8 flex gap-4">
            <Action
              onClick={() => setDeletionTarget(null)}
              disabled={updateDogStatus.isPending || deleteDog.isPending}
              size="small"
              variant="secondary-adaptive"
              className="w-28 shrink-0"
            >
              Cancelar
            </Action>
            <Action
              onClick={() => void confirmDeletion()}
              disabled={updateDogStatus.isPending || deleteDog.isPending}
              size="small"
              variant="primary-adaptive"
              icon="trash-solid"
              className="min-w-0 flex-1 px-4"
            >
              {deleteDog.isPending ? 'Excluindo...' : 'Excluir definitivamente'}
            </Action>
          </div>
        </Dialog>
      )}
    </main>
  )
}
