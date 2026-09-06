import { useId, useState } from 'react'
import { Action, Switch, TextField, getAdminErrorMessage } from '@abrigo/shared'
import type { CareCategory, CareCategoryDraft } from '@abrigo/shared'

type CareCategorySettingsFormProps = {
  categories: CareCategory[]
  layout: 'modal' | 'panel'
  onCancel: () => void
  onSave: (categories: CareCategoryDraft[]) => Promise<void>
}

type EditableCategory = CareCategoryDraft & { key: string }

export function CareCategorySettingsForm({
  categories,
  layout,
  onCancel,
  onSave,
}: CareCategorySettingsFormProps) {
  const formId = useId()
  const [items, setItems] = useState<EditableCategory[]>(() => (
    categories.map((category) => ({ ...category, key: category.id }))
  ))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `mt-1 ${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'}`

  const update = (key: string, patch: Partial<EditableCategory>) => {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item))
  }

  const addCategory = () => {
    setItems((current) => [
      ...current,
      { active: true, key: `new-${crypto.randomUUID()}`, name: '' },
    ])
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const names = items.map((item) => item.name.trim().toLocaleLowerCase('pt-BR'))
    if (names.some((name) => !name)) {
      setSaveError('Preencha o nome de todas as categorias.')
      return
    }
    if (new Set(names).size !== items.length) {
      setSaveError('Os nomes das categorias não podem se repetir.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave(items.map(({ key: _key, ...item }) => ({ ...item, name: item.name.trim() })))
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível salvar as categorias.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={isPanel ? 'grid grid-cols-[13rem_minmax(0,1fr)] gap-8' : ''}>
        <div>
          <h2 className={`${isPanel ? 'text-3xl' : 'text-4xl'} font-medium text-marca`}>
            Editar Categorias
          </h2>
          <p className={`${isPanel ? 'mt-3 text-xl' : 'mt-2 text-2xl'} font-medium`}>
            Gestão de Cuidados
          </p>
        </div>

        <div className={isPanel ? '' : 'mt-8'}>
          <p className="text-sm">
            Categorias desativadas permanecem nos itens existentes e não aparecem em novos cadastros.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            {items.map((item, index) => (
              <fieldset key={item.key} className="rounded-2xl border-2 border-cinza-medio p-4 dark:border-cinza-claro">
                <legend className="px-1 font-medium">Categoria {index + 1}</legend>
                <label htmlFor={`${formId}-${item.key}-name`} className="block text-sm font-medium">
                  Nome*
                  <TextField
                    id={`${formId}-${item.key}-name`}
                    value={item.name}
                    onChange={(event) => update(item.key, { name: event.target.value })}
                    maxLength={40}
                    required
                    className={fieldClasses}
                  />
                </label>
                <div className="mt-4 flex items-center justify-between gap-4">
                  {item.id ? (
                    <>
                      <label htmlFor={`${formId}-${item.key}-active`} className="text-sm font-medium">
                        Disponível para novos itens
                      </label>
                      <Switch
                        id={`${formId}-${item.key}-active`}
                        checked={item.active}
                        onChange={(active) => update(item.key, { active })}
                        aria-label={`Categoria ${item.name || index + 1} ativa`}
                      />
                    </>
                  ) : (
                    <Action
                      onClick={() => setItems((current) => current.filter((currentItem) => currentItem.key !== item.key))}
                      size="link-small"
                      variant="ghost-adaptive"
                    >
                      Remover nova categoria
                    </Action>
                  )}
                </div>
              </fieldset>
            ))}
          </div>
          <Action onClick={addCategory} icon="plus-circle-solid" size="admin-row" variant="neutral-adaptive" className="mt-4 min-h-11">
            Adicionar categoria
          </Action>
        </div>
      </div>

      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}

      <div className={`${isPanel ? 'mt-6' : 'mt-8'} flex gap-4`}>
        <Action onClick={onCancel} disabled={isSaving} size="small" variant="secondary-adaptive" className="w-28 shrink-0">
          Cancelar
        </Action>
        <Action type="submit" disabled={isSaving} size="small" variant="primary-adaptive" className="min-w-0 flex-1">
          {isSaving ? 'Salvando...' : 'Salvar categorias'}
        </Action>
      </div>
    </form>
  )
}
