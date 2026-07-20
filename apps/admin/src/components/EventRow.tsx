import { Action, Icon } from '@abrigo/shared'
import type { EventStatus, FundraisingEvent } from '../events/events'
import { AdminListRow } from './AdminListRow'
import { StatusBadge } from './StatusBadge'

type EventRowProps = {
  event: FundraisingEvent
  isEditing: boolean
  onDraw: () => void
  onEdit: () => void
  onOpenReservations: () => void
  onRemove: () => void
  onSetStatus: (status: EventStatus) => void
}

const STATUS = {
  active: { label: 'Ativo', tone: 'verde' },
  draft: { label: 'Rascunho', tone: 'marca-escura' },
  ended: { label: 'Encerrado', tone: 'amarelo' },
} as const

export function EventRow({
  event,
  isEditing,
  onDraw,
  onEdit,
  onOpenReservations,
  onRemove,
  onSetStatus,
}: EventRowProps) {
  const status = STATUS[event.status]

  return (
    <AdminListRow
      isEditing={isEditing}
      className="flex min-w-0 items-center gap-3 rounded-3xl p-4 sm:p-6 desk:rounded-2xl desk:p-3"
    >
      <div className="flex w-16 shrink-0 flex-col gap-2 sm:w-24 desk:w-16">
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl bg-cinza-claro sm:size-24 desk:size-16 dark:bg-cinza-medio">
          <Icon name="pata" className="size-8 text-cinza-medio dark:text-cinza-claro" />
          {event.gallery[0] && (
            <img src={event.gallery[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <StatusBadge tone={status.tone} size="sm" className="w-full justify-center">
          {status.label}
        </StatusBadge>
      </div>

      <p className="min-w-0 flex-1 text-base leading-tight font-medium sm:text-lg">{event.title}</p>

      <div className="flex min-w-0 max-w-[14rem] shrink flex-wrap justify-end gap-2">
        {event.status !== 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="book-solid"
            className="gap-1 px-3 py-2"
            onClick={onOpenReservations}
          >
            Reservas
          </Action>
        )}
        {event.receiptFolderUrl && (
          <Action
            href={event.receiptFolderUrl}
            target="_blank"
            rel="noreferrer"
            size="small"
            variant="neutral-adaptive"
            icon="open-book"
            className="gap-1 px-3 py-2"
          >
            Comprovantes
          </Action>
        )}
        {event.status === 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="check-circle-solid"
            className="gap-1 px-3 py-2"
            onClick={() => onSetStatus('active')}
          >
            Publicar
          </Action>
        )}
        <Action
          size="small"
          variant={isEditing ? 'secondary-adaptive' : 'neutral-adaptive'}
          icon="edit-pencil"
          aria-pressed={isEditing}
          className="gap-1 px-3 py-2"
          onClick={onEdit}
        >
          Editar
        </Action>
        {event.status !== 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="dice-five"
            className="gap-1 px-3 py-2"
            onClick={onDraw}
          >
            Sortear
          </Action>
        )}
        {event.status === 'active' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="white-flag-solid"
            className="gap-1 px-3 py-2"
            onClick={() => onSetStatus('ended')}
          >
            Encerrar
          </Action>
        )}
        {event.status === 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className="gap-1 px-3 py-2"
            onClick={onRemove}
          >
            Remover
          </Action>
        )}
        {event.status === 'ended' && (
          <>
            <Action
              size="small"
              variant="neutral-adaptive"
              icon="refresh-circle"
              className="gap-1 px-3 py-2"
              onClick={() => onSetStatus('active')}
            >
              Reativar
            </Action>
            <Action
              size="small"
              variant="neutral-adaptive"
              icon="archive"
              className="gap-1 px-3 py-2"
              onClick={onRemove}
            >
              Arquivar
            </Action>
          </>
        )}
      </div>
    </AdminListRow>
  )
}
