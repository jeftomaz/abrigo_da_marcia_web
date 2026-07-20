type StatCardsProps = {
  label: string
  total: number
  items?: {
    label: string
    value: number
    className?: string
  }[]
}

export function StatCards({ label, total, items = [] }: StatCardsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-h-20 items-center justify-between rounded-xl bg-marca px-5 py-4 text-marca-clara desk:min-h-24 desk:rounded-2xl desk:px-6 desk:py-5">
        <span className="text-lg font-medium">{label}</span>
        <span className="text-4xl font-medium desk:text-5xl">{total}</span>
      </div>
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {items.map((item) => <StatCard key={item.label} {...item} />)}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div
      className={`flex min-h-20 items-center justify-between rounded-xl bg-surface-raised px-5 py-4 text-on-surface-raised desk:min-h-24 desk:rounded-2xl desk:px-6 desk:py-5 ${className}`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-3xl font-medium desk:text-4xl">{value}</span>
    </div>
  )
}
