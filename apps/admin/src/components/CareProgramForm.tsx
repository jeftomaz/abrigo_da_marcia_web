import { useEffect, useId, useMemo, useState } from 'react'
import {
  Action,
  Switch,
  TextField,
  getAdminErrorMessage,
} from '@abrigo/shared'
import type { CareItem, CareProgram, CareProgramDraft, CareScope, Dog } from '@abrigo/shared'

type CareProgramFormProps = {
  assignedDogIds: string[]
  dogs: Dog[]
  items: CareItem[]
  onCancel: () => void
  onCreateItem: () => void
  onSave: (draft: CareProgramDraft) => Promise<void>
  preferredItemId?: string
  program: CareProgram | null
}

export function CareProgramForm({
  assignedDogIds,
  dogs,
  items,
  onCancel,
  onCreateItem,
  onSave,
  preferredItemId,
  program,
}: CareProgramFormProps) {
  const formId = useId()
  const [name, setName] = useState(program?.name ?? '')
  const [itemId, setItemId] = useState(program?.itemId ?? preferredItemId ?? '')
  const [scope, setScope] = useState<CareScope>(program?.scope ?? 'todos')
  const [dogIds, setDogIds] = useState(
    assignedDogIds.filter((id) => dogs.some((dog) => dog.id === id && dog.status === 'disponivel')),
  )
  const [defaultDose, setDefaultDose] = useState(program?.defaultDose ?? '')
  const [defaultFrequency, setDefaultFrequency] = useState(program?.defaultFrequency ?? '')
  const [defaultIntervalDays, setDefaultIntervalDays] = useState(
    program?.defaultIntervalDays ? String(program.defaultIntervalDays) : '',
  )
  const [instructions, setInstructions] = useState(program?.instructions ?? '')
  const [startDate, setStartDate] = useState(program?.startDate ?? '')
  const [endDate, setEndDate] = useState(program?.endDate ?? '')
  const [active, setActive] = useState(program?.active ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const selectedItem = items.find((item) => item.id === itemId)
  const availableDogs = useMemo(
    () => dogs
      .filter((dog) => dog.status === 'disponivel')
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    [dogs],
  )

  useEffect(() => {
    if (preferredItemId) setItemId(preferredItemId)
  }, [preferredItemId])

  const toggleDog = (dogId: string) => {
    setDogIds((current) =>
      current.includes(dogId) ? current.filter((id) => id !== dogId) : [...current, dogId],
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const interval = defaultIntervalDays ? Number(defaultIntervalDays) : null
    if (!name.trim() || !itemId) {
      setSaveError('Informe o nome e o item do programa.')
      return
    }
    if (active && !selectedItem?.active) {
      setSaveError('Reative o item de cuidado antes de ativar este programa.')
      return
    }
    if (scope === 'selecionados' && dogIds.length === 0) {
      setSaveError('Selecione ao menos um cão para este programa.')
      return
    }
    if (interval !== null && (!Number.isInteger(interval) || interval < 1 || interval > 3650)) {
      setSaveError('O intervalo deve ser um número inteiro entre 1 e 3650 dias.')
      return
    }
    if (startDate && endDate && endDate < startDate) {
      setSaveError('A data final não pode ser anterior à data inicial.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        active,
        defaultDose: defaultDose.trim(),
        defaultFrequency: defaultFrequency.trim(),
        defaultIntervalDays: interval,
        dogIds: scope === 'selecionados' ? dogIds : [],
        endDate,
        id: program?.id,
        instructions: instructions.trim(),
        itemId,
        name: name.trim(),
        scope,
        startDate,
      })
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível salvar o programa de cuidado.'))
    } finally {
      setIsSaving(false)
    }
  }

  const fieldClasses = 'mt-1 px-3 py-2'
  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-3xl font-medium text-marca">
        {program ? 'Editar programa' : 'Novo programa'}
      </h2>

      <section className="mt-6">
        <h3 className="text-xl font-medium">Identificação</h3>
        <label htmlFor={`${formId}-name`} className="mt-3 block font-medium">
          Nome do programa*
          <TextField
            id={`${formId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className={fieldClasses}
          />
        </label>
        <div className="mt-4 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label htmlFor={`${formId}-item`} className="block font-medium">
            Item de cuidado*
            <TextField
              as="select"
              id={`${formId}-item`}
              value={itemId}
              onChange={(event) => {
                const nextId = event.target.value
                setItemId(nextId)
                if (!items.find((item) => item.id === nextId)?.active) setActive(false)
              }}
              required
              className={fieldClasses}
            >
              <option value="" disabled>Selecionar</option>
              {items.map((item) => (
                <option key={item.id} value={item.id} disabled={!item.active}>
                  {item.category} — {item.name}{item.presentation ? ` (${item.presentation})` : ''}{item.active ? '' : ' — inativo'}
                </option>
              ))}
            </TextField>
          </label>
          <Action onClick={onCreateItem} size="link-small" variant="ghost-adaptive">
            Cadastrar novo item
          </Action>
        </div>
      </section>

      <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
        <h3 className="text-xl font-medium">Abrangência</h3>
        <label htmlFor={`${formId}-scope`} className="mt-3 block font-medium">
          Atende*
          <TextField
            as="select"
            id={`${formId}-scope`}
            value={scope}
            onChange={(event) => setScope(event.target.value as CareScope)}
            className={fieldClasses}
          >
            <option value="todos">Todos os cães no abrigo</option>
            <option value="selecionados">Somente cães selecionados</option>
          </TextField>
        </label>

        {scope === 'selecionados' && (
          <fieldset className="mt-4">
            <legend className="font-medium">Cães do programa*</legend>
            <div className="mt-2 grid max-h-52 gap-2 overflow-y-auto rounded-xl border-2 border-cinza-medio p-3 sm:grid-cols-2 dark:border-cinza-claro">
              {availableDogs.map((dog) => (
                <label key={dog.id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-cinza-claro dark:hover:bg-cinza-medio">
                  <input
                    type="checkbox"
                    checked={dogIds.includes(dog.id)}
                    onChange={() => toggleDog(dog.id)}
                    className="size-5 accent-marca"
                  />
                  <span className="min-w-0 truncate font-medium">{dog.name}</span>
                </label>
              ))}
              {availableDogs.length === 0 && <p className="text-sm">Nenhum cão disponível.</p>}
            </div>
          </fieldset>
        )}
      </section>

      <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
        <h3 className="text-xl font-medium">Planejamento</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${formId}-dose`} className="block font-medium">
            Dose padrão
            <TextField
              id={`${formId}-dose`}
              value={defaultDose}
              onChange={(event) => setDefaultDose(event.target.value)}
              maxLength={120}
              className={fieldClasses}
            />
          </label>
          <label htmlFor={`${formId}-frequency`} className="block font-medium">
            Frequência
            <TextField
              id={`${formId}-frequency`}
              value={defaultFrequency}
              onChange={(event) => setDefaultFrequency(event.target.value)}
              maxLength={160}
              className={fieldClasses}
            />
          </label>
          <label htmlFor={`${formId}-interval`} className="block font-medium">
            Intervalo em dias
            <TextField
              id={`${formId}-interval`}
              type="number"
              min={1}
              max={3650}
              step={1}
              value={defaultIntervalDays}
              onChange={(event) => setDefaultIntervalDays(event.target.value)}
              className={fieldClasses}
            />
          </label>
          <div className="hidden sm:block" />
          <label htmlFor={`${formId}-start-date`} className="block font-medium">
            Data inicial
            <TextField
              id={`${formId}-start-date`}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={fieldClasses}
            />
          </label>
          <label htmlFor={`${formId}-end-date`} className="block font-medium">
            Data final
            <TextField
              id={`${formId}-end-date`}
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className={fieldClasses}
            />
          </label>
        </div>
        <label htmlFor={`${formId}-instructions`} className="mt-4 block font-medium">
          Instruções internas
          <TextField
            as="textarea"
            id={`${formId}-instructions`}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={1000}
            rows={3}
            className={`${fieldClasses} resize-y`}
          />
        </label>
      </section>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div>
          <label htmlFor={`${formId}-active`} className="font-medium">Programa ativo</label>
          {!selectedItem?.active && itemId && (
            <p className="mt-1 text-xs text-marca">O item selecionado está inativo.</p>
          )}
        </div>
        <Switch
          id={`${formId}-active`}
          checked={active}
          onChange={setActive}
          disabled={Boolean(itemId && !selectedItem?.active)}
          aria-label="Programa ativo"
        />
      </div>

      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}

      <div className="mt-7 flex gap-4">
        <Action onClick={onCancel} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28 shrink-0">
          Cancelar
        </Action>
        <Action type="submit" disabled={isSaving} size="small" variant="primary-adaptive" className="min-w-0 flex-1">
          {isSaving ? 'Salvando...' : 'Salvar programa'}
        </Action>
      </div>
    </form>
  )
}
