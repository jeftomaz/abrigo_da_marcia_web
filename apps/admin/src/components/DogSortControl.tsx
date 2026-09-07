import { useId } from 'react'
import { DOG_SORT_OPTIONS, SelectField } from '@abrigo/shared'
import type { DogSortOrder } from '@abrigo/shared'

type DogSortControlProps = {
  value: DogSortOrder
  onChange: (value: DogSortOrder) => void
}

const OPTIONS = DOG_SORT_OPTIONS.flatMap((option) => (
  (['asc', 'desc'] as const).map((direction) => ({
    value: `${option.value}-${direction}` as DogSortOrder,
    label: `${option.label}: ${option[direction]}`,
  }))
))

export function DogSortControl({ value, onChange }: DogSortControlProps) {
  return (
    <SelectField
      id={useId()}
      label="Ordem"
      variant="toolbar"
      value={value}
      onChange={(next) => {
        const option = OPTIONS.find((item) => item.value === next)
        if (option) onChange(option.value)
      }}
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </SelectField>
  )
}
