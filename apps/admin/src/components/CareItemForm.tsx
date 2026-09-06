import { useId, useState } from 'react'
import { Action, Switch, TextField, getAdminErrorMessage } from '@abrigo/shared'
import type { CareCategory, CareFrequency, CareItem, CareItemDraft } from '@abrigo/shared'

type CareItemFormProps = {
  categories: CareCategory[]
  item: CareItem | null
  frequencies: CareFrequency[]
  onCancel: () => void
  onSave: (draft: CareItemDraft) => Promise<void>
}

export function CareItemForm({ categories, frequencies, item, onCancel, onSave }: CareItemFormProps) {
  const formId = useId()
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [frequencyId, setFrequencyId] = useState(item?.frequencyId ?? '')
  const [stockQuantity, setStockQuantity] = useState(String(item?.stockQuantity ?? 0))
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const fieldClasses = 'mt-1 px-3 py-2'
  const parsedStockQuantity = Number(stockQuantity)
  const stockChanged = Boolean(item)
    && parsedStockQuantity !== item?.stockQuantity

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !category.trim()) {
      setSaveError('Informe o nome e a categoria do item.')
      return
    }
    if (
      !Number.isFinite(parsedStockQuantity)
      || parsedStockQuantity < 0
      || parsedStockQuantity > 999999999.999
      || !/^\d+(?:\.\d{1,3})?$/.test(stockQuantity)
    ) {
      setSaveError('Informe um estoque entre 0 e 999999999,999, com até três casas decimais.')
      return
    }
    if (stockChanged && !stockAdjustmentReason.trim()) {
      setSaveError('Informe o motivo do ajuste manual de estoque.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        active,
        category: category.trim(),
        expectedUpdatedAt: item?.audit?.updatedAt ?? '',
        frequencyId,
        id: item?.id,
        name: name.trim(),
        notes: notes.trim(),
        stockAdjustmentReason: stockAdjustmentReason.trim(),
        stockQuantity: parsedStockQuantity,
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
        <div>
          <label htmlFor={`${formId}-category`} className="block font-medium">Categoria*</label>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <TextField
              as="select"
              id={`${formId}-category`}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              required
              className="px-3 py-2"
            >
              <option value="" disabled>Selecionar</option>
              {categories.map((option) => (
                <option
                  key={option.id}
                  value={option.name}
                  disabled={!option.active && option.name !== item?.category}
                >
                  {option.name}{option.active ? '' : ' — inativa'}
                </option>
              ))}
            </TextField>
            <Action
              to="/configuracoes?editor=care-categories"
              size="admin-inline"
              variant="neutral-adaptive"
            >
              Gerenciar
            </Action>
          </div>
        </div>
      </div>

      <fieldset className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
        <legend className="text-xl font-medium">Administração</legend>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <label htmlFor={`${formId}-frequency`} className="block font-medium">
            Frequência
            <TextField
              as="select"
              id={`${formId}-frequency`}
              value={frequencyId}
              onChange={(event) => setFrequencyId(event.target.value)}
              className={fieldClasses}
            >
              <option value="">Sem frequência definida</option>
              {frequencies.map((frequency) => (
                <option
                  key={frequency.id}
                  value={frequency.id}
                  disabled={!frequency.active && frequency.id !== item?.frequencyId}
                >
                  {frequency.label}{frequency.active ? '' : ' — inativa'}
                </option>
              ))}
            </TextField>
          </label>
          <Action
            to="/configuracoes?editor=care-frequencies"
            size="admin-inline"
            variant="neutral-adaptive"
          >
            Gerenciar
          </Action>
        </div>
      </fieldset>

      <fieldset className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
        <legend className="text-xl font-medium">Estoque</legend>
        <p className="mt-2 text-xs">Cada aplicação baixa automaticamente a quantidade usada.</p>
        <label htmlFor={`${formId}-stock`} className="mt-4 block font-medium">
          Quantidade disponível*
          <TextField
            id={`${formId}-stock`}
            type="number"
            min={0}
            max={999999999.999}
            step={0.001}
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
            required
            className={fieldClasses}
          />
        </label>
        {stockChanged && (
          <label htmlFor={`${formId}-stock-reason`} className="mt-4 block font-medium">
            Motivo do ajuste de estoque*
            <TextField
              id={`${formId}-stock-reason`}
              value={stockAdjustmentReason}
              onChange={(event) => setStockAdjustmentReason(event.target.value)}
              maxLength={500}
              placeholder="Ex.: perda de medicamento ou entrada de novas unidades"
              required
              className={fieldClasses}
            />
          </label>
        )}
      </fieldset>

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
