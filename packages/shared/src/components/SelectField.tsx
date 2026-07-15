import type { ReactNode } from 'react'
import { Icon } from './Icon'

type SelectFieldProps = {
  accessibleLabel?: string
  children: ReactNode
  className?: string
  id: string
  label: string
  onChange: (value: string) => void
  value: string
  variant: 'filter' | 'product'
}

const WRAPPER_CLASSES = {
  filter: 'grid grid-cols-[6.5rem_1fr] items-center gap-4 lg:block',
  product: 'min-w-0',
}

const LABEL_CLASSES = {
  filter: 'text-lg font-medium lg:block lg:text-center',
  product: 'block text-center text-sm font-medium',
}

const CONTROL_CLASSES = {
  filter: 'relative lg:mt-1',
  product: 'relative mt-1',
}

const SELECT_CLASSES = {
  filter:
    'min-h-10 w-full appearance-none rounded-full bg-marca-escura px-5 py-2 text-center text-base font-medium text-marca-clara outline-none focus-visible:ring-2 focus-visible:ring-marca-clara dark:bg-marca',
  product:
    'h-9 w-full appearance-none rounded-full bg-marca pr-2 pl-7 text-center text-xs font-medium text-marca-clara outline-none focus-visible:ring-2 focus-visible:ring-marca-clara sm:text-sm',
}

const ICON_CLASSES = {
  filter: 'right-4',
  product: 'left-3',
}

export function SelectField({
  accessibleLabel,
  children,
  className = '',
  id,
  label,
  onChange,
  value,
  variant,
}: SelectFieldProps) {
  return (
    <div className={`${WRAPPER_CLASSES[variant]} ${className}`}>
      <label htmlFor={id} className={LABEL_CLASSES[variant]}>
        {label}
      </label>
      <div className={CONTROL_CLASSES[variant]}>
        <select
          id={id}
          aria-label={accessibleLabel}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASSES[variant]}
        >
          {children}
        </select>
        <Icon
          name="arrow-separate-vertical"
          className={`pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-marca-clara ${ICON_CLASSES[variant]}`}
        />
      </div>
    </div>
  )
}
