type StatCardsProps = {
  total: number
  disponiveis: number
  adotados: number
  falecidos: number
}

export function StatCards({ total, disponiveis, adotados, falecidos }: StatCardsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-h-24 items-center justify-between rounded-2xl bg-marca px-6 py-5 text-marca-clara desk:min-h-24">
        <span className="text-lg font-medium">Total de cães</span>
        <span className="text-5xl font-medium">{total}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Disponíveis" value={disponiveis} />
        <StatCard label="Adotados" value={adotados} />
        <StatCard label="Falecidos" value={falecidos} className="col-span-2" />
      </div>
    </div>
  )
}

function StatCard({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div
      className={`flex min-h-24 items-center justify-between rounded-2xl bg-cinza-claro px-6 py-5 text-cinza-escuro desk:bg-white dark:bg-cinza-medio dark:text-cinza-claro desk:dark:bg-black ${className}`}
    >
      <span className="font-medium">{label}</span>
      <span className="text-4xl font-medium">{value}</span>
    </div>
  )
}
