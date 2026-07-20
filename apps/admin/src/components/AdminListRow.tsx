import type { ReactNode } from 'react'

type AdminListRowProps = {
  children: ReactNode
  className?: string
  isEditing: boolean
}

export function AdminListRow({
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
    </article>
  )
}
