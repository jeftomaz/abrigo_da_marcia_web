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
//
// `preview` mostra 4 cards: no mobile eles completam as duas colunas, sem a lacuna
// que sobrava com 3; no desktop viram carrossel horizontal com 3 à vista, seguindo o
// mesmo padrão dos prêmios da rifa. `page` continua grade pura, com todos os itens.
const VARIANT_CLASSES: Record<CardGridVariant, string> = {
  page: 'grid grid-cols-2 lg:grid-cols-3 mt-10 gap-5 lg:gap-6',
  preview:
    'grid grid-cols-2 mt-8 gap-4 lg:flex lg:snap-x lg:overflow-x-auto lg:overscroll-x-contain lg:pb-2',
}

// Largura de 1/3 do container menos os 2 vãos de `gap-4`: três cards ficam visíveis e
// o quarto pede a rolagem. Vive aqui, e não no consumidor, para os quatro previews não
// voltarem a divergir.
const PREVIEW_ITEM_CLASSES =
  'lg:[&>*]:w-[calc((100%-2rem)/3)] lg:[&>*]:shrink-0 lg:[&>*]:snap-start'

export function CardGrid({ children, label, variant = 'page' }: CardGridProps) {
  return (
    <section
      aria-label={label}
      className={`${VARIANT_CLASSES[variant]} ${variant === 'preview' ? PREVIEW_ITEM_CLASSES : ''}`}
    >
      {children}
    </section>
  )
}
