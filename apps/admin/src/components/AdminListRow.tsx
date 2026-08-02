import type { ReactNode } from 'react'
import type { AuditMetadata } from '@abrigo/shared'

type AdminListRowProps = {
  audit?: AuditMetadata | null
  children: ReactNode
  className?: string
  isEditing: boolean
}

export function AdminListRow({
  audit,
  children,
  className = '',
  isEditing,
}: AdminListRowProps) {
  return (
    <article
      className={`bg-surface-raised text-on-surface-raised ${className} ${
        isEditing ? 'desk:bg-surface-inverted desk:text-on-surface-inverted' : ''
      }`}
    >
      {children}
      {audit && (
        <p className="col-span-full mt-1 text-xs text-cinza-medio dark:text-cinza-claro/70">
          Última alteração em {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(audit.updatedAt))} por {audit.updatedByName}
        </p>
      )}
    </article>
  )
}
