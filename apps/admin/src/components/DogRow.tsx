import { Action, ImagePlaceholder, STATUS_LABELS, getDogPhotoUrl } from '@abrigo/shared'
import type { Dog, DogStatus } from '@abrigo/shared'
import { AdminListRow } from './AdminListRow'
import { OptionToggle } from './OptionToggle'
import { StatusBadge, type StatusTone } from './StatusBadge'

type DogRowProps = {
  dog: Dog
  isEditing: boolean
  onEdit: () => void
  onRemove: () => void
  onSetFeatured: (featured: boolean) => void
  onSetStatus: (status: DogStatus) => void
}

const STATUS_TONE: Record<DogStatus, StatusTone> = {
  disponivel: 'verde',
  adotado: 'marca-escura',
  falecido: 'neutro',
}

const ACTION_CLASSES =
  'min-h-11 w-full min-w-0 !gap-2 !px-3 !py-2 !text-sm [&_svg]:size-5'

export function DogRow({ dog, isEditing, onEdit, onRemove, onSetFeatured, onSetStatus }: DogRowProps) {
  return (
    <AdminListRow
      audit={dog.audit}
      isEditing={isEditing}
      className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-3 rounded-2xl p-3 min-[28rem]:grid-cols-[4rem_minmax(0,1fr)_13.5rem] min-[28rem]:items-center"
    >
      <div className="flex w-12 shrink-0 flex-col items-start gap-2 min-[28rem]:w-16 min-[28rem]:relative min-[28rem]:block">
        <div className="relative size-12 overflow-hidden rounded-xl min-[28rem]:size-16">
          {dog.photos[0] ? (
            <img
              src={getDogPhotoUrl(dog.photos[0])}
              alt=""
              className="absolute inset-0 h-full w-full rounded-xl object-cover"
            />
          ) : (
            <ImagePlaceholder label={`Sem foto de ${dog.name}`} className="h-full w-full" />
          )}
        </div>
        <StatusBadge tone={STATUS_TONE[dog.status]} size="sm" className="min-[28rem]:absolute min-[28rem]:-bottom-2 min-[28rem]:left-0">
          {STATUS_LABELS[dog.status]}
        </StatusBadge>
      </div>

      <p className="min-w-0 self-center text-base leading-tight font-medium min-[28rem]:text-lg">{dog.name}</p>

      <div className="col-span-2 grid min-w-0 grid-cols-2 items-stretch gap-2 min-[28rem]:col-span-1 min-[28rem]:col-start-3 min-[28rem]:row-start-1">
        <OptionToggle
          className="h-full w-full min-w-0"
          size="compact"
          first={{
            label: 'Adotado',
            accessibleLabel: dog.status === 'adotado' ? `Retornar ${dog.name} para Disponível` : `Marcar ${dog.name} como Adotado`,
            icon: 'home-simple-door',
            onClick: () => onSetStatus(dog.status === 'adotado' ? 'disponivel' : 'adotado'),
            active: dog.status === 'adotado',
            disabled: dog.status === 'falecido',
          }}
          second={{
            label: 'Falecido',
            accessibleLabel: dog.status === 'falecido' ? `Retornar ${dog.name} para Disponível` : `Marcar ${dog.name} como Falecido`,
            icon: 'eye-closed',
            onClick: () => onSetStatus(dog.status === 'falecido' ? 'disponivel' : 'falecido'),
            active: dog.status === 'falecido',
            disabled: dog.status === 'adotado',
          }}
        />

        <div className="flex min-w-0 flex-col gap-2">
          <Action
            onClick={onEdit}
            size="small"
            variant={isEditing ? 'secondary-adaptive' : 'neutral-adaptive'}
            icon="edit-pencil"
            aria-pressed={isEditing}
            className={ACTION_CLASSES}
          >
            Editar
          </Action>
          <Action
            onClick={onRemove}
            size="small"
            variant="neutral-adaptive"
            icon="trash-solid"
            className={ACTION_CLASSES}
          >
            Remover
          </Action>
        </div>

        <Action
          onClick={() => onSetFeatured(!dog.featured)}
          size="small"
          variant={dog.featured ? 'secondary-adaptive' : 'neutral-adaptive'}
          icon="star"
          aria-pressed={dog.featured}
          aria-label={dog.featured ? `Remover ${dog.name} do destaque do catálogo` : `Destacar ${dog.name} no catálogo`}
          className={`${ACTION_CLASSES} col-span-2`}
        >
          Destacar no catálogo
        </Action>
      </div>
    </AdminListRow>
  )
}
