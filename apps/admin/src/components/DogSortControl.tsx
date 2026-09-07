import { useId, useState } from 'react'
import { Action, DOG_SORT_OPTIONS, TextField } from '@abrigo/shared'
import type { DogSortOrder } from '@abrigo/shared'
import { ConfirmationDialog } from './ConfirmationDialog'

type DogSortControlProps = {
  value: DogSortOrder
  onChange: (value: DogSortOrder) => void
}

export function DogSortControl({ value, onChange }: DogSortControlProps) {
  const id = useId()
  const [draft, setDraft] = useState<DogSortOrder | null>(null)

  const selected = DOG_SORT_OPTIONS.find((option) => draft?.startsWith(`${option.value}-`))
  const direction = draft?.endsWith('-asc') ? 'asc' : 'desc'

  return (
    <>
      <Action
        onClick={(event) => { event.currentTarget.focus(); setDraft(value) }}
        icon="arrow-separate-vertical"
        size="small"
        variant="secondary-adaptive"
        aria-haspopup="dialog"
      >
        Ordem
      </Action>
      {draft !== null && (
        <ConfirmationDialog
          title="Ordem"
          description="Escolha a ordem de exibição dos cães."
          confirmLabel="Aplicar"
          onCancel={() => setDraft(null)}
          onConfirm={() => { onChange(draft); setDraft(null) }}
        >
          <label htmlFor={id} className="mt-5 block text-sm font-medium">Ordenar por</label>
          <TextField
            as="select"
            id={id}
            value={selected?.value}
            onChange={(event) => {
              const option = DOG_SORT_OPTIONS.find((item) => item.value === event.target.value)
              if (option) setDraft(`${option.value}-${direction}`)
            }}
            className="mt-2 p-2 text-sm scheme-light dark:scheme-dark"
          >
            {DOG_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </TextField>
          <label htmlFor={`${id}-direction`} className="mt-4 block text-sm font-medium">Sentido</label>
          <TextField
            as="select"
            id={`${id}-direction`}
            value={direction}
            onChange={(event) => {
              const next = event.target.value
              if (selected && (next === 'asc' || next === 'desc')) setDraft(`${selected.value}-${next}`)
            }}
            className="mt-2 p-2 text-sm scheme-light dark:scheme-dark"
          >
            <option value="asc">{selected?.asc}</option>
            <option value="desc">{selected?.desc}</option>
          </TextField>
        </ConfirmationDialog>
      )}
    </>
  )
}
