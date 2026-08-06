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
  'min-h-11 w-full min-w-0 !gap-0.5 !px-1 !py-2 !text-xs [&_svg]:size-3 [&_span]:min-w-0 [&_span]:truncate min-[24rem]:!gap-1 min-[24rem]:!px-2 min-[24rem]:!text-sm min-[24rem]:[&_svg]:size-4'

export function DogRow({ dog, isEditing, onEdit, onRemove, onSetFeatured, onSetStatus }: DogRowProps) {
  return (
    <AdminListRow
      audit={dog.audit}
      isEditing={isEditing}
      className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)_9.25rem] items-center gap-2 rounded-2xl p-3 min-[24rem]:grid-cols-[4rem_minmax(0,1fr)_11.5rem] min-[24rem]:gap-3 desk:grid-cols-[4rem_minmax(0,1fr)_13.5rem]"
    >
      <div className="flex w-12 shrink-0 flex-col items-start gap-2 min-[24rem]:relative min-[24rem]:block min-[24rem]:w-16">
        <div className="relative size-12 overflow-hidden rounded-xl min-[24rem]:size-16">
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
        <StatusBadge tone={STATUS_TONE[dog.status]} size="sm" className="min-[24rem]:absolute min-[24rem]:-bottom-2 min-[24rem]:left-0">
          {STATUS_LABELS[dog.status]}
        </StatusBadge>
      </div>

      <div className="flex min-w-0 flex-col items-start gap-2 self-center">
        <p className="min-w-0 text-base leading-tight font-medium min-[24rem]:text-lg">{dog.name}</p>
        <Action
          onClick={() => onSetFeatured(!dog.featured)}
          size="small"
          variant={dog.featured ? 'secondary-adaptive' : 'neutral-adaptive'}
          icon="star"
          aria-pressed={dog.featured}
          aria-label={dog.featured ? `Remover ${dog.name} do destaque do catálogo` : `Destacar ${dog.name} no catálogo`}
          className="min-h-9 max-w-full min-w-0 !gap-1 !px-2 !py-1.5 !text-xs [&_svg]:size-4 [&_span]:min-w-0 [&_span]:truncate"
        >
          {dog.featured ? 'Em destaque' : 'Destacar'}
        </Action>
      </div>

      <div className="col-start-3 row-start-1 grid min-w-0 grid-cols-2 items-stretch gap-2">
        <OptionToggle
          className="h-full w-full min-w-0 [&>button]:!gap-0.5 [&>button]:!px-1 [&_svg]:!size-3 min-[24rem]:[&>button]:!gap-2 min-[24rem]:[&>button]:!px-2 min-[24rem]:[&_svg]:!size-3.5"
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
      </div>
    </AdminListRow>
  )
}
