import { useId, useState } from 'react'
import { Action, Switch, TextField, getAdminErrorMessage } from '@abrigo/shared'
import type { CareItem, CareItemDraft } from '@abrigo/shared'

type CareItemFormProps = {
  item: CareItem | null
  onCancel: () => void
  onSave: (draft: CareItemDraft) => Promise<void>
}

export function CareItemForm({ item, onCancel, onSave }: CareItemFormProps) {
  const formId = useId()
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [presentation, setPresentation] = useState(item?.presentation ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fieldClasses = 'mt-1 px-3 py-2'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !category.trim()) {
      setSaveError('Informe o nome e a categoria do item.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        active,
        category: category.trim(),
        id: item?.id,
        name: name.trim(),
        notes: notes.trim(),
        presentation: presentation.trim(),
      })
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível salvar o item de cuidado.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-3xl font-medium text-marca">
        {item ? 'Editar item de cuidado' : 'Novo item de cuidado'}
      </h2>
      <p className="mt-2 text-sm">
        O catálogo é livre: cadastre vacinas, medicamentos, exames ou qualquer outro cuidado.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label htmlFor={`${formId}-name`} className="block font-medium">
          Nome*
          <TextField
            id={`${formId}-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
            className={fieldClasses}
          />
        </label>
        <label htmlFor={`${formId}-category`} className="block font-medium">
          Categoria*
          <TextField
            id={`${formId}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={40}
            placeholder="Ex.: Vacina"
            required
            className={fieldClasses}
          />
        </label>
      </div>

      <label htmlFor={`${formId}-presentation`} className="mt-4 block font-medium">
        Apresentação
        <TextField
          id={`${formId}-presentation`}
          value={presentation}
          onChange={(event) => setPresentation(event.target.value)}
          maxLength={80}
          placeholder="Ex.: frasco com 10 doses"
          className={fieldClasses}
        />
      </label>

      <label htmlFor={`${formId}-notes`} className="mt-4 block font-medium">
        Observações internas
        <TextField
          as="textarea"
          id={`${formId}-notes`}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          className={`${fieldClasses} resize-y`}
        />
      </label>

      <div className="mt-5 flex items-center justify-between gap-4">
        <label htmlFor={`${formId}-active`} className="font-medium">Item ativo</label>
        <Switch
          id={`${formId}-active`}
          checked={active}
          onChange={setActive}
          aria-label="Item ativo"
        />
      </div>

      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}

      <div className="mt-7 flex gap-4">
        <Action onClick={onCancel} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28 shrink-0">
          Cancelar
        </Action>
        <Action type="submit" disabled={isSaving} size="small" variant="primary-adaptive" className="min-w-0 flex-1">
          {isSaving ? 'Salvando...' : 'Salvar item'}
        </Action>
      </div>
    </form>
  )
}
