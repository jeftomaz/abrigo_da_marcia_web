import { Action, ImagePlaceholder } from '@abrigo/shared'
import { getEventPhotoUrl } from '../events/events'
import type { EventStatus, FundraisingEvent } from '../events/events'
import { AdminListRow } from './AdminListRow'
import { StatusBadge } from './StatusBadge'

type EventRowProps = {
  event: FundraisingEvent
  isEditing: boolean
  isManaging: boolean
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
  onDraw,
  onEnd,
  onEdit,
  onOpenReservations,
  onRemove,
  onSetStatus,
}: EventRowProps) {
  const status = STATUS[event.status]
  const actionClasses = 'min-h-11 w-full min-w-0 !gap-2 !px-3 !py-2 !text-sm [&_svg]:size-5 min-[28rem]:!gap-1 min-[28rem]:!px-2 min-[28rem]:!text-xs min-[28rem]:[&_svg]:size-4 sm:!gap-2 sm:!px-3 sm:!text-sm sm:[&_svg]:size-5 desk:!gap-1.5 desk:!px-2 desk:!text-sm desk:[&_svg]:size-5'

  return (
    <AdminListRow
      audit={event.audit}
      isEditing={isEditing || isManaging}
      className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-start gap-4 rounded-3xl p-4 min-[28rem]:grid-cols-[5rem_minmax(0,1fr)_12rem] min-[28rem]:items-center min-[28rem]:gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_17rem] sm:gap-4 sm:p-6 desk:grid-cols-[5rem_minmax(0,1fr)_12.5rem] desk:gap-3 desk:rounded-2xl desk:p-4"
    >
      <div className="flex w-20 shrink-0 flex-col gap-2 sm:w-24 desk:w-20">
        <div className="relative size-20 overflow-hidden rounded-xl sm:size-24 desk:size-20">
          {event.gallery[0] ? (
            <img src={getEventPhotoUrl(event.gallery[0])} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <ImagePlaceholder label={`Sem foto de ${event.title || 'evento'}`} className="h-full w-full" />
          )}
        </div>
        <StatusBadge tone={status.tone} className="w-full justify-center">
          {status.label}
        </StatusBadge>
      </div>

      <p className="min-w-0 self-center text-base leading-tight font-medium sm:text-lg desk:text-base">{event.title || 'Evento sem título'}</p>

      <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2 min-[28rem]:col-span-1 min-[28rem]:col-start-3 min-[28rem]:row-start-1">
        {event.status !== 'draft' && (
          <Action
            size="small"
            variant={isManaging ? 'secondary-adaptive' : 'neutral-adaptive'}
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
        {event.kind === 'raffle' && (event.status === 'active' || event.status === 'ended') && (
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
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="refresh-circle"
            className={`${actionClasses} col-start-2 row-start-2`}
            onClick={() => onSetStatus('active')}
          >
            Reativar
          </Action>
        )}
        {event.status === 'ended' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className={`${actionClasses} ${event.kind === 'raffle' ? 'col-span-2 row-start-3' : 'col-start-1 row-start-2'}`}
            onClick={onRemove}
          >
            Excluir
          </Action>
        )}
        {event.status === 'archived' && (
          <Action
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className={`${actionClasses} col-start-2 row-start-2`}
            onClick={onRemove}
          >
            Excluir
          </Action>
        )}
      </div>
    </AdminListRow>
  )
}
