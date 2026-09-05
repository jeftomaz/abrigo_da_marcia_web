import { useId, useState } from 'react'
import {
  Action,
  CARE_RECORD_TYPE_LABELS,
  TextField,
  currentLocalDateTime,
  getAdminErrorMessage,
} from '@abrigo/shared'
import type {
  CareItem,
  CareProgram,
  CareRecordDraft,
  CareRecordType,
  Dog,
  DogCare,
} from '@abrigo/shared'

type CareRecordFormProps = {
  assignment: DogCare
  dog: Dog
  item: CareItem
  onCancel: () => void
  onSave: (draft: CareRecordDraft) => Promise<void>
  program: CareProgram
}

export function CareRecordForm({ assignment, dog, item, onCancel, onSave, program }: CareRecordFormProps) {
  const formId = useId()
  const [type, setType] = useState<CareRecordType>('aplicacao')
  const [occurredAt, setOccurredAt] = useState(currentLocalDateTime)
  const [dose, setDose] = useState(assignment.dose)
  const [lot, setLot] = useState('')
  const [nextDueOn, setNextDueOn] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isApplication = type === 'aplicacao'
  const showsNextDue = type === 'aplicacao' || type === 'inicio'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const occurredDate = new Date(occurredAt)
    if (!occurredAt || Number.isNaN(occurredDate.getTime())) {
      setSaveError('Informe uma data e hora válidas.')
      return
    }
    if (type === 'observacao' && !notes.trim()) {
      setSaveError('Descreva a observação realizada.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        assignmentId: assignment.id,
        dose: dose.trim(),
        lot: isApplication ? lot.trim() : '',
        nextDueOn: showsNextDue ? nextDueOn : '',
        notes: notes.trim(),
        occurredAt: occurredDate.toISOString(),
        type,
      })
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível registrar o cuidado.'))
    } finally {
      setIsSaving(false)
    }
  }

  const fieldClasses = 'mt-1 px-3 py-2'
  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-3xl font-medium text-marca">Registrar cuidado</h2>
      <p className="mt-3 text-xl font-medium">{dog.name}</p>
      <p className="mt-1 text-sm">{item.name} — {program.name}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${formId}-type`} className="block font-medium">
          Tipo de registro*
          <TextField
            as="select"
            id={`${formId}-type`}
            value={type}
            onChange={(event) => setType(event.target.value as CareRecordType)}
            className={fieldClasses}
          >
            {Object.entries(CARE_RECORD_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </TextField>
        </label>
        <label htmlFor={`${formId}-occurred-at`} className="block font-medium">
          Data e hora*
          <TextField
            id={`${formId}-occurred-at`}
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            required
            className={fieldClasses}
          />
        </label>
        <label htmlFor={`${formId}-dose`} className="block font-medium">
          Dose
          <TextField
            id={`${formId}-dose`}
            value={dose}
            onChange={(event) => setDose(event.target.value)}
            maxLength={120}
            className={fieldClasses}
          />
        </label>
        {isApplication && (
          <label htmlFor={`${formId}-lot`} className="block font-medium">
            Lote
            <TextField
              id={`${formId}-lot`}
              value={lot}
              onChange={(event) => setLot(event.target.value)}
              maxLength={100}
              className={fieldClasses}
            />
          </label>
        )}
        {showsNextDue && (
          <label htmlFor={`${formId}-next-due`} className="block font-medium sm:col-span-2">
            Próxima data
            <TextField
              id={`${formId}-next-due`}
              type="date"
              value={nextDueOn}
              onChange={(event) => setNextDueOn(event.target.value)}
              className={`${fieldClasses} sm:max-w-56`}
            />
            {isApplication && program.defaultIntervalDays && (
              <span className="mt-1 block text-xs">
                Vazio calcula automaticamente pelo intervalo de {program.defaultIntervalDays} dias.
              </span>
            )}
          </label>
        )}
      </div>

      <label htmlFor={`${formId}-notes`} className="mt-4 block font-medium">
        Observações{type === 'observacao' ? '*' : ''}
        <TextField
          as="textarea"
          id={`${formId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          required={type === 'observacao'}
          className={`${fieldClasses} resize-y`}
        />
      </label>

      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}

      <div className="mt-7 flex gap-4">
        <Action onClick={onCancel} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28 shrink-0">
          Cancelar
        </Action>
        <Action type="submit" disabled={isSaving} size="small" variant="primary-adaptive" className="min-w-0 flex-1">
          {isSaving ? 'Registrando...' : 'Registrar'}
        </Action>
      </div>
    </form>
  )
}
