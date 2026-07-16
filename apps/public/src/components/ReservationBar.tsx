import type { ReactNode } from 'react'
import { Action } from '@abrigo/shared'

type ReservationBarProps = {
  children: ReactNode
  className?: string
  expandedContent?: ReactNode
  finishDisabled?: boolean
  onFinish: () => void
  onSecondary: () => void
  secondaryLabel: string
}

export function ReservationBar({
  children,
  className = '',
  expandedContent,
  finishDisabled,
  onFinish,
  onSecondary,
  secondaryLabel,
}: ReservationBarProps) {
  return (
    <div className={`rounded-3xl bg-marca p-2 lg:rounded-full ${className}`}>
      {expandedContent}
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2 lg:grid-cols-[6rem_minmax(0,1fr)_11rem] lg:gap-y-0">
        <div className="col-span-2 row-start-1 min-w-0 lg:col-span-1 lg:col-start-2">
          {children}
        </div>
        <Action
          onClick={onSecondary}
          size="small"
          variant="secondary-on-brand"
          className="col-start-1 row-start-2 min-h-11 w-full px-2 text-sm lg:row-start-1 lg:min-h-0"
        >
          {secondaryLabel}
        </Action>
        <Action
          aria-label="Finalizar sua reserva"
          onClick={onFinish}
          size="small"
          variant="primary-on-brand"
          disabled={finishDisabled}
          className="col-start-2 row-start-2 min-h-11 min-w-0 w-full px-3 text-sm lg:col-start-3 lg:row-start-1 lg:min-h-0"
        >
          <span className="lg:hidden">Finalizar reserva</span>
          <span className="hidden lg:inline">Finalizar sua reserva</span>
        </Action>
      </div>
    </div>
  )
}
