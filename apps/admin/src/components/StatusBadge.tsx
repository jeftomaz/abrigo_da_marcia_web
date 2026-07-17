import type { ReactNode } from 'react'

// Chip de status do admin (sheet "Estados"). O tom carrega a cor; o rótulo vem
// do domínio de cada tela. Cores de estado, iguais em tema claro/escuro.
export type StatusTone = 'verde' | 'amarelo' | 'neutro' | 'marca' | 'marca-escura'

const TONE_CLASSES: Record<StatusTone, string> = {
  verde: 'bg-status-verde text-status-verde-texto',
  amarelo: 'bg-status-amarelo text-status-amarelo-texto',
  neutro: 'bg-cinza-medio text-cinza-claro',
  marca: 'bg-marca text-marca-clara',
  'marca-escura': 'bg-marca-escura text-marca',
}

const SIZE_CLASSES = {
  sm: 'rounded-md px-2 py-0.5 text-xs',
  md: 'rounded-lg px-3 py-1 text-sm',
} as const

type StatusBadgeProps = {
  tone: StatusTone
  size?: keyof typeof SIZE_CLASSES
  className?: string
  children: ReactNode
}

export function StatusBadge({ tone, size = 'md', className = '', children }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  )
}
