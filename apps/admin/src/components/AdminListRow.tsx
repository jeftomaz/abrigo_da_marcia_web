import type { ReactNode } from 'react'
import type { AuditMetadata } from '@abrigo/shared'

type AdminListRowProps = {
  audit?: AuditMetadata | null
  children: ReactNode
  className?: string
  isEditing: boolean
  tone?: 'default' | 'winner'
}

export function AdminListRow({
  audit,
  children,
  className = '',
  isEditing,
  tone = 'default',
}: AdminListRowProps) {
  const toneClasses = tone === 'winner'
    ? 'bg-marca-clara text-marca-escura'
    : 'bg-surface-raised text-on-surface-raised'

  return (
    <article
      className={`${toneClasses} ${className} ${
        isEditing ? 'desk:bg-surface-inverted desk:text-on-surface-inverted' : ''
      }`}
    >
      {children}
      {audit && (
        <p className={`col-span-full mt-1 text-xs ${tone === 'winner' ? 'text-marca-escura' : 'text-cinza-medio dark:text-cinza-claro/70'}`}>
          Última alteração em {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(audit.updatedAt))} por {audit.updatedByName}
        </p>
      )}
    </article>
  )
}
