import { Action, Icon, STATUS_LABELS, getDogPhotoUrl } from '@abrigo/shared'
import type { Dog, DogStatus } from '@abrigo/shared'
import { OptionToggle } from './OptionToggle'
import { StatusBadge, type StatusTone } from './StatusBadge'

type DogRowProps = {
  dog: Dog
  isEditing: boolean
  onEdit: () => void
  onRemove: () => void
  onSetStatus: (status: DogStatus) => void
}

const STATUS_TONE: Record<DogStatus, StatusTone> = {
  disponivel: 'verde',
  adotado: 'marca-escura',
  falecido: 'neutro',
}

export function DogRow({ dog, isEditing, onEdit, onRemove, onSetStatus }: DogRowProps) {
  return (
    <article className="flex min-w-0 items-center gap-2 rounded-2xl bg-surface-raised p-2 text-on-surface-raised sm:gap-3 sm:p-3">
      <div className="relative shrink-0">
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-cinza-claro dark:bg-cinza-medio sm:size-16">
          <Icon name="pata" className="size-7 text-cinza-medio dark:text-cinza-claro sm:size-8" />
          {dog.photos[0] && (
            <img
              src={getDogPhotoUrl(dog.photos[0])}
              alt=""
              className="absolute inset-0 h-full w-full rounded-xl object-cover"
            />
          )}
        </div>
        <StatusBadge tone={STATUS_TONE[dog.status]} size="sm" className="absolute -bottom-2 left-0">
          {STATUS_LABELS[dog.status]}
        </StatusBadge>
      </div>

      <p className="min-w-0 flex-1 text-sm leading-tight font-medium sm:text-lg">{dog.name}</p>

      <OptionToggle
        className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
        first={{
          label: 'Adotado',
          icon: 'home-simple-door',
          onClick: () => onSetStatus('adotado'),
          active: dog.status === 'adotado',
          disabled: dog.status === 'falecido',
        }}
        second={{
          label: 'Falecido',
          icon: 'eye-closed',
          onClick: () => onSetStatus('falecido'),
          active: dog.status === 'falecido',
          disabled: dog.status === 'adotado',
        }}
      />

      <div className="flex w-[5.5rem] shrink-0 flex-col gap-2 sm:w-[6.5rem]">
        <Action
          onClick={onEdit}
          size="small"
          variant={isEditing ? 'secondary' : 'neutral'}
          icon="edit-pencil"
          aria-pressed={isEditing}
          className="w-full gap-1 px-2"
        >
          Editar
        </Action>
        <Action onClick={onRemove} size="small" variant="neutral" icon="trash-solid" className="w-full gap-1 px-2">
          Remover
        </Action>
      </div>
    </article>
  )
}
