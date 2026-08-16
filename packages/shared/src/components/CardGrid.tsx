import type { ReactNode } from 'react'

type CardGridVariant = 'page' | 'preview'

type CardGridProps = {
  children: ReactNode
  label: string
  variant?: CardGridVariant
}

// A grade vivia copiada em Adoção, Histórias e nos dois previews da landing, e as
// cópias divergiram: cada ajuste corrigia uma e deixava as outras três para trás.
// O espaçamento entra aqui, e não por `className`, justamente para não voltar a
// divergir — precisa de outro respiro? Acrescente uma variante.
const VARIANT_CLASSES: Record<CardGridVariant, string> = {
  page: 'mt-10 gap-5 lg:gap-6',
  preview: 'mt-8 gap-4',
}

export function CardGrid({ children, label, variant = 'page' }: CardGridProps) {
  return (
    <section
      aria-label={label}
      className={`grid grid-cols-2 lg:grid-cols-3 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </section>
  )
}
