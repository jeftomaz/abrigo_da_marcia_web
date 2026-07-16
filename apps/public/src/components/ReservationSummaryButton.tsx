import { formatCurrency } from './reservation'

type ReservationSummaryButtonProps = {
  count: number
  expanded: boolean
  pluralLabel: string
  singularLabel: string
  onToggle: () => void
  total: number
}

export function ReservationSummaryButton({
  count,
  expanded,
  pluralLabel,
  singularLabel,
  onToggle,
  total,
}: ReservationSummaryButtonProps) {
  return (
    <button
      type="button"
      disabled={count === 0}
      aria-expanded={expanded}
      onClick={onToggle}
      className="w-full min-w-0 cursor-pointer text-center text-sm leading-tight text-marca-clara disabled:cursor-default disabled:opacity-50"
    >
      <span className="block">
        {count} {count === 1 ? singularLabel : pluralLabel}
      </span>
      <span className="block font-medium">{formatCurrency(total)}</span>
    </button>
  )
}
