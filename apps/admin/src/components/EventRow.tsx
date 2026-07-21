import { Action, Icon } from '@abrigo/shared'
import type { EventStatus, FundraisingEvent } from '../events/events'
import { AdminListRow } from './AdminListRow'
import { StatusBadge } from './StatusBadge'

type EventRowProps = {
  event: FundraisingEvent
  isEditing: boolean
  isManaging: boolean
  onArchive: () => void
  onDraw: () => void
  onEnd: () => void
  onEdit: () => void
  onOpenReservations: () => void
  onRemove: () => void
  onSetStatus: (status: EventStatus) => void
}

const STATUS = {
  active: { label: 'Ativo', tone: 'verde' },
  archived: { label: 'Arquivado', tone: 'neutro' },
  draft: { label: 'Rascunho', tone: 'marca-escura' },
  ended: { label: 'Encerrado', tone: 'amarelo' },
} as const

export function EventRow({
  event,
  isEditing,
  isManaging,
  onArchive,
  onDraw,
  onEnd,
  onEdit,
  onOpenReservations,
  onRemove,
  onSetStatus,
}: EventRowProps) {
  const status = STATUS[event.status]
  const actionClasses = 'w-full min-w-0 !gap-1 !px-1 !py-2 !text-xs [&_svg]:size-4 sm:!px-3 sm:!text-sm sm:[&_svg]:size-5 desk:!px-2 desk:!text-xs desk:[&_svg]:size-4'

  return (
    <AdminListRow
      isEditing={isEditing || isManaging}
      className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-3 rounded-3xl p-4 min-[23rem]:grid-cols-[4rem_minmax(0,1fr)_10.5rem] min-[23rem]:items-center min-[23rem]:gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_17rem] sm:gap-4 sm:p-6 desk:grid-cols-[5rem_minmax(0,1fr)_11.5rem] desk:gap-3 desk:rounded-2xl desk:p-3"
    >
      <div className="flex w-16 shrink-0 flex-col gap-2 sm:w-24 desk:w-20">
        <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-xl bg-cinza-claro sm:size-24 desk:size-20 dark:bg-cinza-medio">
          <Icon name="pata" className="size-8 text-cinza-medio dark:text-cinza-claro" />
          {event.gallery[0] && (
            <img src={event.gallery[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
        </div>
        <StatusBadge tone={status.tone} size="sm" className="w-full justify-center">
          {status.label}
        </StatusBadge>
      </div>

      <p className="min-w-0 self-center text-base leading-tight font-medium sm:text-lg desk:text-sm">{event.title}</p>

      <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 min-[23rem]:col-span-1 min-[23rem]:col-start-3 min-[23rem]:row-start-1">
        {event.status !== 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="book-solid"
            aria-pressed={isManaging}
            className={`${actionClasses} col-start-1 row-start-1`}
            onClick={onOpenReservations}
          >
            Reservas
          </Action>
        )}
        {event.status === 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="check-circle-solid"
            className={`${actionClasses} col-start-1 row-start-1`}
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
          className={`${actionClasses} col-start-2 row-start-1`}
          onClick={onEdit}
        >
          Editar
        </Action>
        {(event.status === 'active' || event.status === 'ended') && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="dice-five"
            className={`${actionClasses} col-start-1 row-start-2`}
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
            className={`${actionClasses} col-start-2 row-start-2`}
            onClick={onEnd}
          >
            Encerrar
          </Action>
        )}
        {event.status === 'draft' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className={`${actionClasses} col-start-2 row-start-2`}
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
              className={`${actionClasses} col-start-2 row-start-2`}
              onClick={() => onSetStatus('active')}
            >
              Reativar
            </Action>
            <Action
              size="small"
              variant="neutral-adaptive"
              icon="archive"
              className={`${actionClasses} col-start-2 row-start-3`}
              onClick={onArchive}
            >
              Arquivar
            </Action>
          </>
        )}
        {event.status === 'archived' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className={`${actionClasses} col-start-2 row-start-2`}
            onClick={onRemove}
          >
            Remover
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
            className={`${actionClasses} col-span-2`}
          >
            Comprovantes
          </Action>
        )}
      </div>
    </AdminListRow>
  )
}
