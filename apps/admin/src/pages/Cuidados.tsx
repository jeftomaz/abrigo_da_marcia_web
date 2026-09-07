import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Action,
  Dialog,
  Icon,
  STATUS_LABELS,
  TextField,
  currentLocalDateTime,
  getDogSearchText,
  getAdminErrorMessage,
  useAdminCare,
  useAdminDogs,
  useCareRecords,
  useSaveCareItem,
  useSaveCareProgram,
  useSaveCareRecord,
  useSetCareItemActive,
} from '@abrigo/shared'
import type { AdminCareData, CareItem, CareProgram, CareProgramDraft, CareRecord, Dog } from '@abrigo/shared'
import { AdminListRow } from '../components/AdminListRow'
import { CareAssignmentCard } from '../components/CareAssignmentCard'
import { CareItemForm } from '../components/CareItemForm'
import { CareProgramCard } from '../components/CareProgramCard'
import { CareProgramForm } from '../components/CareProgramForm'
import { CareRecordForm } from '../components/CareRecordForm'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { StatCards } from '../components/StatCards'
import { StatusBadge } from '../components/StatusBadge'
import { useSuccessMessage } from '../hooks/useSuccessMessage'

type CareView = 'agenda' | 'programas' | 'itens' | 'caes'

const TABS: Array<{ id: CareView; label: string }> = [
  { id: 'agenda', label: 'Agenda' },
  { id: 'programas', label: 'Programas' },
  { id: 'itens', label: 'Itens' },
  { id: 'caes', label: 'Por cão' },
]
const EMPTY_CARE: AdminCareData = { assignments: [], categories: [], frequencies: [], items: [], programs: [] }
const EMPTY_DOGS: Dog[] = []
const EMPTY_RECORDS: CareRecord[] = []

function localDateKey(value: Date | string = new Date()) {
  const date = typeof value === 'string' ? new Date(value) : value
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

export function Cuidados() {
  const [searchParams] = useSearchParams()
  const { data: care = EMPTY_CARE, isLoading: isCareLoading, error: careError } = useAdminCare()
  const { data: dogs = EMPTY_DOGS, isLoading: isDogsLoading, error: dogsError } = useAdminDogs()
  const saveItem = useSaveCareItem()
  const setItemActive = useSetCareItemActive()
  const saveProgram = useSaveCareProgram()
  const saveRecord = useSaveCareRecord()
  const [view, setView] = useState<CareView>(() => (
    searchParams.get('view') === 'itens' ? 'itens' : 'agenda'
  ))
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [programTarget, setProgramTarget] = useState<CareProgram | null | undefined>(undefined)
  const [itemTarget, setItemTarget] = useState<CareItem | null | undefined>(undefined)
  const [itemReturnsToProgram, setItemReturnsToProgram] = useState(false)
  const [preferredItemId, setPreferredItemId] = useState('')
  const [recordTargetId, setRecordTargetId] = useState('')
  const [quickRecordTargetId, setQuickRecordTargetId] = useState('')
  const [quickRecordOccurredAt, setQuickRecordOccurredAt] = useState(currentLocalDateTime)
  const [quickRecordError, setQuickRecordError] = useState('')
  const [showCreationHelp, setShowCreationHelp] = useState(false)
  const [operationError, setOperationError] = useState('')
  const [successMessage, showSuccess] = useSuccessMessage()
  const { assignments, categories, frequencies, items, programs } = care

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const programById = useMemo(
    () => new Map(programs.map((program) => [program.id, program])),
    [programs],
  )
  const dogById = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs])
  const query = normalizeSearch(search).replace(/^#/, '')
  const today = localDateKey()
  const availableTags = useMemo(
    () => [...new Set(dogs.flatMap((dog) => dog.tags))].sort((left, right) => left.localeCompare(right, 'pt-BR')),
    [dogs],
  )

  const agendaAssignments = useMemo(
    () => assignments.filter((assignment) => {
      const dog = dogById.get(assignment.dogId)
      const program = programById.get(assignment.programId)
      const item = program ? itemById.get(program.itemId) : undefined
      if (!dog || !program?.active || !item?.active || dog.status !== 'disponivel') return false
      if (!['pendente', 'em_andamento'].includes(assignment.status)) return false
      if (!query) return true
      return normalizeSearch(`${dog.name} ${dog.tags.join(' ')} ${program.name} ${item.name} ${item.category}`).includes(query)
    }),
    [assignments, dogById, itemById, programById, query],
  )

  const filteredPrograms = useMemo(
    () => programs.filter((program) => {
      const item = itemById.get(program.itemId)
      return !query || normalizeSearch(`${program.name} ${item?.name ?? ''} ${item?.category ?? ''}`).includes(query)
    }),
    [itemById, programs, query],
  )
  const filteredItems = useMemo(
    () => items.filter((item) => !query || normalizeSearch(`${item.name} ${item.category} ${item.frequencyLabel}`).includes(query)),
    [items, query],
  )
  const filteredDogs = useMemo(
    () => dogs.filter((dog) => (
      (!tagFilter || dog.tags.includes(tagFilter))
      && (!query || normalizeSearch(`${getDogSearchText(dog)} ${STATUS_LABELS[dog.status]}`).includes(query))
    )),
    [dogs, query, tagFilter],
  )
  const dogViewPrograms = useMemo(() => {
    const assignedProgramIds = new Set(assignments.map((assignment) => assignment.programId))
    return programs.filter((program) => (
      itemById.has(program.itemId) && (program.active || assignedProgramIds.has(program.id))
    ))
  }, [assignments, itemById, programs])
  const assignmentsByDog = useMemo(() => {
    const grouped = new Map<string, typeof assignments>()
    assignments.forEach((assignment) => {
      const dogAssignments = grouped.get(assignment.dogId) ?? []
      dogAssignments.push(assignment)
      grouped.set(assignment.dogId, dogAssignments)
    })
    return grouped
  }, [assignments])
  const assignmentByDogAndProgram = useMemo(
    () => new Map(assignments.map((assignment) => [`${assignment.dogId}:${assignment.programId}`, assignment])),
    [assignments],
  )
  const dogViewAssignmentIds = useMemo(
    () => view === 'caes' ? assignments.map((assignment) => assignment.id) : [],
    [assignments, view],
  )
  const { data: dogViewRecords = EMPTY_RECORDS } = useCareRecords(dogViewAssignmentIds)
  const recordsByAssignment = useMemo(() => {
    const grouped = new Map<string, CareRecord[]>()
    dogViewRecords.forEach((record) => {
      const assignmentRecords = grouped.get(record.assignmentId) ?? []
      assignmentRecords.push(record)
      grouped.set(record.assignmentId, assignmentRecords)
    })
    return grouped
  }, [dogViewRecords])

  const assignedDogIds = (program: CareProgram | null) => program
    ? assignments
      .filter((assignment) => assignment.programId === program.id && assignment.status !== 'dispensado')
      .map((assignment) => assignment.dogId)
    : []

  const openProgram = (program: CareProgram | null) => {
    setOperationError('')
    setPreferredItemId('')
    setProgramTarget(program)
  }

  const openItem = (item: CareItem | null, returnsToProgram = false) => {
    setOperationError('')
    setItemReturnsToProgram(returnsToProgram)
    setItemTarget(item)
  }

  const handleSaveItem = async (draft: Parameters<typeof saveItem.mutateAsync>[0]) => {
    const savedItemId = await saveItem.mutateAsync(draft)
    if (itemReturnsToProgram) setPreferredItemId(savedItemId)
    setItemTarget(undefined)
    showSuccess(draft.id ? 'Item de cuidado atualizado.' : 'Item de cuidado cadastrado.')
  }

  const handleSaveProgram = async (draft: CareProgramDraft) => {
    await saveProgram.mutateAsync(draft)
    setProgramTarget(undefined)
    showSuccess(draft.id ? 'Programa atualizado.' : 'Programa cadastrado.')
  }

  const toggleProgram = async (program: CareProgram) => {
    setOperationError('')
    try {
      await saveProgram.mutateAsync({
        ...program,
        active: !program.active,
        dogIds: program.scope === 'selecionados' ? assignedDogIds(program) : [],
      })
      showSuccess(program.active ? 'Programa desativado.' : 'Programa ativado.')
    } catch (error) {
      setOperationError(getAdminErrorMessage(error, 'Não foi possível alterar o programa.'))
    }
  }

  const toggleItem = async (item: CareItem) => {
    setOperationError('')
    try {
      await setItemActive.mutateAsync({
        active: !item.active,
        audit: item.audit,
        id: item.id,
      })
      showSuccess(item.active ? 'Item desativado.' : 'Item ativado.')
    } catch (error) {
      setOperationError(getAdminErrorMessage(error, 'Não foi possível alterar o item de cuidado.'))
    }
  }

  const recordTarget = assignments.find((assignment) => assignment.id === recordTargetId)
  const recordDog = recordTarget ? dogById.get(recordTarget.dogId) : undefined
  const recordProgram = recordTarget ? programById.get(recordTarget.programId) : undefined
  const recordItem = recordProgram ? itemById.get(recordProgram.itemId) : undefined
  const quickRecordTarget = assignments.find((assignment) => assignment.id === quickRecordTargetId)
  const quickRecordDog = quickRecordTarget ? dogById.get(quickRecordTarget.dogId) : undefined
  const quickRecordProgram = quickRecordTarget ? programById.get(quickRecordTarget.programId) : undefined
  const quickRecordItem = quickRecordProgram ? itemById.get(quickRecordProgram.itemId) : undefined

  const confirmQuickRecord = async () => {
    if (!quickRecordTarget || !quickRecordDog || !quickRecordItem) return
    const occurredDate = new Date(quickRecordOccurredAt)
    if (!quickRecordOccurredAt || Number.isNaN(occurredDate.getTime())) {
      setQuickRecordError('Informe uma data e hora válidas.')
      return
    }

    setQuickRecordError('')
    try {
      await saveRecord.mutateAsync({
        assignmentId: quickRecordTarget.id,
        dose: quickRecordTarget.dose,
        lot: '',
        nextDueAt: '',
        notes: '',
        occurredAt: occurredDate.toISOString(),
        stockQuantityUsed: 1,
        type: 'aplicacao',
      })
      setQuickRecordTargetId('')
      showSuccess(`${quickRecordItem.name} marcado como realizado para ${quickRecordDog.name}.`)
    } catch (error) {
      setQuickRecordError(getAdminErrorMessage(error, 'Não foi possível registrar o cuidado.'))
    }
  }

  const isLoading = isCareLoading || isDogsLoading
  const loadError = careError || dogsError
  const searchPlaceholder = view === 'agenda'
    ? 'Buscar cão, cuidado ou programa...'
    : view === 'programas'
      ? 'Buscar programa...'
      : view === 'itens'
        ? 'Buscar item...'
        : 'Buscar cão por nome, tag, porte ou idade...'

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-3 py-4 text-cinza-escuro sm:px-6 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className="mx-auto w-full max-w-[75rem]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium text-marca desk:text-3xl">Cuidados</h1>
            <p className="mt-1 text-sm">Agenda e programas privados do abrigo.</p>
          </div>
          <div role="tablist" aria-label="Visões de Cuidados" className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <Action
                key={tab.id}
                role="tab"
                aria-selected={view === tab.id}
                onClick={() => {
                  setView(tab.id)
                  setSearch('')
                  setTagFilter('')
                  setOperationError('')
                }}
                size="small"
                variant={view === tab.id ? 'primary-adaptive' : 'surface-adaptive'}
                className="min-h-11 shrink-0"
              >
                {tab.label}
              </Action>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="relative min-w-0">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Buscar em Cuidados"
              className="h-11 w-full rounded-full bg-white pr-4 pl-12 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
            />
          </div>
          {(view === 'programas' || view === 'itens') && (
            <div>
              {view === 'itens' ? (
                <Action onClick={() => openItem(null)} icon="plus-circle-solid" size="admin-row" variant="primary-adaptive" className="min-h-11 w-full">
                  Novo item
                </Action>
              ) : (
                <Action onClick={() => openProgram(null)} icon="keyframe-plus-in-solid" size="admin-row" variant="primary-adaptive" className="min-h-11 w-full">
                  Novo programa
                </Action>
              )}
            </div>
          )}
        </div>

        {(view === 'programas' || view === 'itens') && (
          <section aria-label="Ajuda sobre itens e programas" className="mt-1">
            <Action
              type="button"
              aria-controls="care-creation-help"
              aria-expanded={showCreationHelp}
              onClick={() => setShowCreationHelp((current) => !current)}
              icon="info-circle-solid"
              size="admin-row"
              variant="neutral-adaptive"
              className="ml-auto min-h-11"
            >
              {showCreationHelp ? 'Ocultar explicação' : 'O que são item e programa?'}
            </Action>
            {showCreationHelp && (
              <div
                id="care-creation-help"
                role="note"
                aria-label="Diferença entre item e programa"
                className="grid gap-3 rounded-2xl bg-surface-raised p-4 text-sm text-on-surface-raised sm:grid-cols-2"
              >
                <p><strong className="text-marca-escura dark:text-marca-clara">Item:</strong> é o cuidado em si e concentra sua frequência de administração e estoque, quando aplicáveis.</p>
                <p><strong className="text-marca-escura dark:text-marca-clara">Programa:</strong> define a dose, o período e para quais cães o item será aplicado.</p>
              </div>
            )}
          </section>
        )}

        {isLoading && <p role="status" className="mt-8 text-center">Carregando cuidados...</p>}
        {loadError && <p role="alert" className="mt-8 text-center">Não foi possível carregar os cuidados.</p>}
        {operationError && <p role="alert" className="mt-5 text-center font-medium text-marca">{operationError}</p>}
        {successMessage && <p role="status" className="mt-5 text-center text-sm font-medium text-status-verde-on-surface">{successMessage}</p>}

        {!isLoading && !loadError && view === 'agenda' && (
          <div className="mt-6 grid gap-6 desk:grid-cols-[22rem_minmax(0,1fr)] desk:items-start">
            <StatCards
              label="Cuidados pendentes"
              total={agendaAssignments.length}
              items={[
                { label: 'Atrasados', value: agendaAssignments.filter((item) => item.nextDueAt && localDateKey(item.nextDueAt) < today).length },
                { label: 'Hoje', value: agendaAssignments.filter((item) => item.nextDueAt && localDateKey(item.nextDueAt) === today).length },
                { label: 'Sem data', value: agendaAssignments.filter((item) => !item.nextDueAt).length, className: 'col-span-2' },
              ]}
            />
            <section aria-label="Agenda de cuidados" className="flex min-w-0 flex-col gap-3">
              {agendaAssignments.map((assignment) => {
                const dog = dogById.get(assignment.dogId)
                const program = programById.get(assignment.programId)
                const item = program ? itemById.get(program.itemId) : undefined
                return dog && program && item ? (
                  <CareAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    dog={dog}
                    item={item}
                    program={program}
                    onRecord={() => setRecordTargetId(assignment.id)}
                  />
                ) : null
              })}
              {agendaAssignments.length === 0 && <p className="text-center">Nenhum cuidado pendente encontrado.</p>}
            </section>
          </div>
        )}

        {!isLoading && !loadError && view === 'programas' && (
          <section aria-labelledby="care-programs-heading" className="mt-6 min-w-0">
            <h2 id="care-programs-heading" className="text-xl font-medium text-marca">Programas</h2>
            <div className="mt-3 flex flex-col gap-3">
              {filteredPrograms.map((program) => {
                const item = itemById.get(program.itemId)
                return item ? (
                  <CareProgramCard
                    key={program.id}
                    program={program}
                    item={item}
                    isPending={saveProgram.isPending}
                    assignedDogs={assignedDogIds(program).length}
                    onEdit={() => openProgram(program)}
                    onToggleActive={() => void toggleProgram(program)}
                  />
                ) : null
              })}
              {filteredPrograms.length === 0 && <p className="text-center">Nenhum programa encontrado.</p>}
            </div>
          </section>
        )}

        {!isLoading && !loadError && view === 'itens' && (
          <section aria-labelledby="care-items-heading" className="mt-6 min-w-0">
            <h2 id="care-items-heading" className="text-xl font-medium text-marca">Itens do catálogo</h2>
            <p className="mt-1 text-sm">Para preservar programas e históricos, itens cadastrados não são excluídos. Desative os que não estiverem mais em uso.</p>
            <div className="mt-3 flex flex-col gap-3">
              {filteredItems.map((item) => (
                <AdminListRow
                  key={item.id}
                  audit={item.audit}
                  isEditing={false}
                  className="grid min-w-0 gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                      <StatusBadge tone={item.active ? 'verde' : 'neutro'} size="sm">
                        {item.active ? 'Ativo' : 'Inativo'}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-marca">{item.category}</p>
                    {item.frequencyLabel && <p className="mt-1 text-sm">{item.frequencyLabel}</p>}
                    <p className="mt-1 text-sm">Estoque disponível: {item.stockQuantity}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                    <Action onClick={() => openItem(item)} size="admin-row" variant="neutral-adaptive" icon="edit-pencil" className="min-h-11 w-full">
                      Editar
                    </Action>
                    <Action
                      onClick={() => void toggleItem(item)}
                      disabled={setItemActive.isPending}
                      size="admin-row"
                      variant={item.active ? 'secondary-adaptive' : 'primary-adaptive'}
                      className="min-h-11 w-full"
                    >
                      {item.active ? 'Desativar' : 'Ativar'}
                    </Action>
                  </div>
                </AdminListRow>
              ))}
              {filteredItems.length === 0 && <p className="text-center">Nenhum item encontrado.</p>}
            </div>
          </section>
        )}

        {!isLoading && !loadError && view === 'caes' && (
          <section aria-label="Cuidados por cão" className="mt-6 min-w-0">
            <p className="text-sm">Todos os cães aparecem abertos. Os programas seguem a mesma ordem; “Não recebe” identifica os cuidados não atribuídos.</p>
            {availableTags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Agrupar cães por tag">
                <button
                  type="button"
                  aria-pressed={!tagFilter}
                  onClick={() => setTagFilter('')}
                  className={`min-h-10 rounded-full px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-marca ${!tagFilter ? 'bg-marca text-marca-clara' : 'bg-surface-raised text-on-surface-raised'}`}
                >
                  Todas as tags
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={tagFilter === tag}
                    onClick={() => setTagFilter((current) => current === tag ? '' : tag)}
                    className={`min-h-10 rounded-full px-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-marca ${tagFilter === tag ? 'bg-marca text-marca-clara' : 'bg-surface-raised text-on-surface-raised'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex min-w-0 flex-col gap-8">
              {filteredDogs.length === 0 ? (
                <p className="text-center">Nenhum cão encontrado.</p>
              ) : filteredDogs.map((dog) => {
                const dogAssignments = assignmentsByDog.get(dog.id) ?? []
                const assignedCareCount = dogAssignments.filter((assignment) => assignment.status !== 'dispensado').length
                return (
                  <section key={dog.id} aria-label={`Cuidados de ${dog.name}`} className="flex min-w-0 flex-col gap-3">
                    <div className="rounded-2xl bg-marca p-4 text-marca-clara">
                      <h2 className="text-2xl font-medium">{dog.name}</h2>
                      {dog.tags.length > 0 && <p className="mt-1 text-sm">{dog.tags.map((tag) => `#${tag}`).join(' · ')}</p>}
                      <p className="text-sm">
                        {STATUS_LABELS[dog.status]}
                        {dogViewPrograms.length > 0 && ` · ${assignedCareCount} de ${dogViewPrograms.length} ${dogViewPrograms.length === 1 ? 'cuidado atribuído' : 'cuidados atribuídos'}`}
                      </p>
                    </div>
                    <div className="grid min-w-0 items-stretch gap-3 desk:grid-cols-2">
                      {dogViewPrograms.length === 0 ? (
                        <AdminListRow isEditing={false} className="rounded-2xl p-4">
                          <p className="text-sm">Nenhum programa de cuidado cadastrado.</p>
                        </AdminListRow>
                      ) : dogViewPrograms.map((program) => {
                        const item = itemById.get(program.itemId)
                        const assignment = assignmentByDogAndProgram.get(`${dog.id}:${program.id}`)
                        if (!item) return null
                        if (!assignment) {
                          return (
                            <AdminListRow
                              key={program.id}
                              isEditing={false}
                              className="flex min-h-40 min-w-0 flex-col justify-center rounded-2xl p-4"
                            >
                              <StatusBadge tone="neutro" size="sm">Não recebe</StatusBadge>
                              <p className="mt-2 font-medium text-marca">{item.name}</p>
                              <p className="mt-0.5 text-sm">{program.name}</p>
                            </AdminListRow>
                          )
                        }
                        const records = recordsByAssignment.get(assignment.id) ?? []
                        return (
                          <CareAssignmentCard
                            key={program.id}
                            assignment={assignment}
                            dog={dog}
                            item={item}
                            program={program}
                            records={records}
                            recordedToday={records.some((record) => record.type === 'aplicacao' && localDateKey(record.occurredAt) === today)}
                            showDog={false}
                            onRecord={() => setRecordTargetId(assignment.id)}
                            onQuickRecord={() => {
                              setQuickRecordOccurredAt(currentLocalDateTime())
                              setQuickRecordError('')
                              setQuickRecordTargetId(assignment.id)
                            }}
                          />
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {programTarget !== undefined && (
        <Dialog
          active={itemTarget === undefined}
          ariaLabel={programTarget ? 'Editar programa' : 'Novo programa'}
          onClose={() => setProgramTarget(undefined)}
          className="max-h-[92vh] w-full max-w-[48rem] overflow-y-auto rounded-3xl bg-surface-raised p-5 text-on-surface-raised sm:p-8"
        >
          <CareProgramForm
            key={programTarget?.id ?? 'new'}
            program={programTarget}
            items={items}
            dogs={dogs}
            assignedDogIds={assignedDogIds(programTarget)}
            preferredItemId={preferredItemId}
            onCreateItem={() => openItem(null, true)}
            onCancel={() => setProgramTarget(undefined)}
            onSave={handleSaveProgram}
          />
        </Dialog>
      )}

      {itemTarget !== undefined && (
        <Dialog
          ariaLabel={itemTarget ? 'Editar item de cuidado' : 'Novo item de cuidado'}
          onClose={() => setItemTarget(undefined)}
          className="max-h-[92vh] w-full max-w-[38rem] overflow-y-auto rounded-3xl bg-surface-raised p-5 text-on-surface-raised sm:p-8"
        >
          <CareItemForm
            key={itemTarget?.id ?? 'new'}
            categories={categories}
            frequencies={frequencies}
            item={itemTarget}
            onCancel={() => setItemTarget(undefined)}
            onSave={handleSaveItem}
          />
        </Dialog>
      )}

      {recordTarget && recordDog && recordProgram && recordItem && (
        <Dialog
          ariaLabel="Registrar cuidado"
          onClose={() => setRecordTargetId('')}
          className="max-h-[92vh] w-full max-w-[42rem] overflow-y-auto rounded-3xl bg-surface-raised p-5 text-on-surface-raised sm:p-8"
        >
          <CareRecordForm
            assignment={recordTarget}
            dog={recordDog}
            item={recordItem}
            program={recordProgram}
            onCancel={() => setRecordTargetId('')}
            onSave={async (draft) => {
              await saveRecord.mutateAsync(draft)
              setRecordTargetId('')
              showSuccess('Cuidado registrado.')
            }}
          />
        </Dialog>
      )}

      {quickRecordTarget && quickRecordDog && quickRecordProgram && quickRecordItem && (
        <ConfirmationDialog
          title="Confirmar cuidado realizado"
          description={`Confirme ${quickRecordItem.name}${quickRecordTarget.dose ? ` (${quickRecordTarget.dose})` : ''} para ${quickRecordDog.name}. ${quickRecordItem.frequencyLabel ? `A próxima data será calculada conforme a frequência do item (${quickRecordItem.frequencyLabel.toLocaleLowerCase('pt-BR')}).` : 'O item não possui próxima frequência definida.'} Uma unidade será baixada do estoque.`}
          confirmLabel="Confirmar realização"
          isPending={saveRecord.isPending}
          onCancel={() => {
            setQuickRecordTargetId('')
            setQuickRecordError('')
          }}
          onConfirm={() => void confirmQuickRecord()}
        >
          <label htmlFor="quick-care-occurred-at" className="mt-5 block font-medium">
            Data e hora da realização*
            <TextField
              id="quick-care-occurred-at"
              type="datetime-local"
              value={quickRecordOccurredAt}
              max={currentLocalDateTime()}
              onChange={(event) => setQuickRecordOccurredAt(event.target.value)}
              required
              className="mt-1 px-3 py-2"
            />
            <span className="mt-1 block text-xs">Ajuste se o cuidado foi administrado antes.</span>
          </label>
          {quickRecordError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{quickRecordError}</p>}
        </ConfirmationDialog>
      )}
    </main>
  )
}
