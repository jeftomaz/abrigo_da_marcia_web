import { Action, Icon } from '@abrigo/shared'
import { STATUS_LABELS, type Dog, type DogStatus } from '../data/dogs'
import { OptionToggle } from './OptionToggle'
import { StatusBadge, type StatusTone } from './StatusBadge'

type DogRowProps = {
  dog: Dog
  onEdit: () => void
  onRemove: () => void
  onSetStatus: (status: DogStatus) => void
}

const STATUS_TONE: Record<DogStatus, StatusTone> = {
  disponivel: 'verde',
  adotado: 'marca-escura',
  falecido: 'neutro',
}

export function DogRow({ dog, onEdit, onRemove, onSetStatus }: DogRowProps) {
  return (
    <article className="flex min-w-0 items-center gap-2 rounded-2xl bg-surface-raised p-2 text-on-surface-raised sm:gap-3 sm:p-3">
      <div className="relative shrink-0">
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-cinza-claro dark:bg-cinza-medio sm:size-16">
          <Icon name="pata" className="size-7 text-cinza-medio dark:text-cinza-claro sm:size-8" />
        </div>
        <StatusBadge tone={STATUS_TONE[dog.status]} size="sm" className="absolute -bottom-2 left-0">
          {STATUS_LABELS[dog.status]}
        </StatusBadge>
      </div>

      <p className="min-w-0 flex-1 text-sm leading-tight font-medium sm:text-lg">{dog.name}</p>

      <OptionToggle
        className="w-[5.5rem] shrink-0 sm:w-[6.5rem]"
        first={{ label: 'Adotado', icon: 'home-simple-door', onClick: () => onSetStatus('adotado') }}
        second={{ label: 'Falecido', icon: 'eye-closed', onClick: () => onSetStatus('falecido') }}
      />

      <div className="flex w-[5.5rem] shrink-0 flex-col gap-2 sm:w-[6.5rem]">
        <Action onClick={onEdit} size="small" variant="neutral" icon="edit-pencil" className="w-full gap-1 px-2">
          Editar
        </Action>
        <Action onClick={onRemove} size="small" variant="neutral" icon="trash-solid" className="w-full gap-1 px-2">
          Remover
        </Action>
      </div>
    </article>
  )
}
