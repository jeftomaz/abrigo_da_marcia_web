import { useId, useState } from 'react'
import { Action, Switch, TextField, formatCareFrequency, getAdminErrorMessage } from '@abrigo/shared'
import type {
  CareFrequency,
  CareFrequencyDraft,
  CareIntervalUnit,
} from '@abrigo/shared'

type CareFrequencySettingsFormProps = {
  frequencies: CareFrequency[]
  layout: 'modal' | 'panel'
  onCancel: () => void
  onSave: (frequencies: CareFrequencyDraft[]) => Promise<void>
}

type EditableFrequency = CareFrequencyDraft & { key: string }

const INTERVAL_UNIT_LABELS: Record<CareIntervalUnit, string> = {
  ano: 'ano(s)',
  dia: 'dia(s)',
  hora: 'hora(s)',
  mes: 'mês(es)',
  semana: 'semana(s)',
}

export function CareFrequencySettingsForm({
  frequencies,
  layout,
  onCancel,
  onSave,
}: CareFrequencySettingsFormProps) {
  const formId = useId()
  const predefinedFrequencies = frequencies.filter((frequency) => frequency.predefined)
  const [items, setItems] = useState<EditableFrequency[]>(() => (
    frequencies
      .filter((frequency) => !frequency.predefined)
      .map((frequency) => ({
        active: frequency.active,
        id: frequency.id,
        intervalCount: frequency.intervalCount,
        intervalUnit: frequency.intervalUnit,
        key: frequency.id,
      }))
  ))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `mt-1 ${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'}`

  const update = (key: string, patch: Partial<EditableFrequency>) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item))
  }

  const addFrequency = () => {
    setItems((current) => [
      ...current,
      {
        active: true,
        intervalCount: 2,
        intervalUnit: 'dia',
        key: `new-${crypto.randomUUID()}`,
      },
    ])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (items.some((item) => (
      !Number.isInteger(item.intervalCount)
      || item.intervalCount < 1
      || item.intervalCount > 10000
    ))) {
      setSaveError('Toda equivalência deve ser um número inteiro entre 1 e 10000.')
      return
    }
    const intervalKeys = [...predefinedFrequencies, ...items]
      .map((item) => `${item.intervalUnit}:${item.intervalCount}`)
    if (new Set(intervalKeys).size !== intervalKeys.length) {
      setSaveError('Essa frequência já está cadastrada.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave(items.map(({ key: _key, ...item }) => item))
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível salvar as frequências.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={isPanel ? 'grid grid-cols-[13rem_minmax(0,1fr)] gap-8' : ''}>
        <div>
          <h2 className={`${isPanel ? 'text-3xl' : 'text-4xl'} font-medium text-marca`}>
            Gerenciar Frequências
          </h2>
          <p className={`${isPanel ? 'mt-3 text-xl' : 'mt-2 text-2xl'} font-medium`}>
            Gestão de Cuidados
          </p>
        </div>

        <div className={isPanel ? '' : 'mt-8'}>
          <p className="text-sm">
            As frequências preestabelecidas não podem ser alteradas. Cadastre intervalos personalizados quando necessário.
          </p>
          <h3 className="mt-5 text-lg font-medium">Preestabelecidas</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {predefinedFrequencies.map((frequency) => (
              <li key={frequency.id} className="rounded-xl bg-cinza-claro px-4 py-3 text-sm dark:bg-cinza-escuro">
                {frequency.label}
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-lg font-medium">Personalizadas</h3>
          {items.length === 0 && <p className="mt-2 text-sm">Nenhuma frequência personalizada.</p>}
          <div className="mt-4 flex flex-col gap-4">
            {items.map((item, index) => (
              <fieldset key={item.key} className="rounded-2xl border-2 border-cinza-medio p-4 dark:border-cinza-claro">
                <legend className="px-1 font-medium">Personalizada {index + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label htmlFor={`${formId}-${item.key}-count`} className="block text-sm font-medium">
                    Intervalo*
                    <TextField
                      id={`${formId}-${item.key}-count`}
                      type="number"
                      min={1}
                      max={10000}
                      step={1}
                      value={item.intervalCount}
                      onChange={(event) => update(item.key, { intervalCount: Number(event.target.value) })}
                      required
                      className={fieldClasses}
                    />
                  </label>
                  <label htmlFor={`${formId}-${item.key}-unit`} className="block text-sm font-medium">
                    Unidade*
                    <TextField
                      as="select"
                      id={`${formId}-${item.key}-unit`}
                      value={item.intervalUnit}
                      onChange={(event) => update(item.key, { intervalUnit: event.target.value as CareIntervalUnit })}
                      className={fieldClasses}
                    >
                      {Object.entries(INTERVAL_UNIT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </TextField>
                  </label>
                </div>
                <p className="mt-3 text-sm font-medium">{formatCareFrequency(item)}</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  {item.id ? (
                    <>
                      <label htmlFor={`${formId}-${item.key}-active`} className="text-sm font-medium">Disponível para novos itens</label>
                      <Switch
                        id={`${formId}-${item.key}-active`}
                        checked={item.active}
                        onChange={(active) => update(item.key, { active })}
                        aria-label={`${formatCareFrequency(item)} ativa`}
                      />
                    </>
                  ) : (
                    <Action
                      onClick={() => setItems((current) => current.filter((currentItem) => currentItem.key !== item.key))}
                      size="link-small"
                      variant="ghost-adaptive"
                    >
                      Remover nova frequência
                    </Action>
                  )}
                </div>
              </fieldset>
            ))}
          </div>
          <Action onClick={addFrequency} icon="plus-circle-solid" size="admin-row" variant="neutral-adaptive" className="mt-4 min-h-11">
            Adicionar personalizada
          </Action>
        </div>
      </div>

      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}

      <div className={`${isPanel ? 'mt-6' : 'mt-8'} flex gap-4`}>
        <Action onClick={onCancel} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28 shrink-0">
          Cancelar
        </Action>
        <Action type="submit" disabled={isSaving} size="small" variant="primary-adaptive" className="min-w-0 flex-1">
          {isSaving ? 'Salvando...' : 'Salvar personalizadas'}
        </Action>
      </div>
    </form>
  )
}
