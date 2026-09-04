import { Action } from '@abrigo/shared'
import type { CareItem, CareProgram } from '@abrigo/shared'
import { AdminListRow } from './AdminListRow'
import { StatusBadge } from './StatusBadge'

type CareProgramCardProps = {
  assignedDogs: number
  isPending: boolean
  item: CareItem
  onEdit: () => void
  onToggleActive: () => void
  program: CareProgram
}

export function CareProgramCard({ assignedDogs, isPending, item, onEdit, onToggleActive, program }: CareProgramCardProps) {
  return (
    <AdminListRow
      audit={program.audit}
      isEditing={false}
      className="grid min-w-0 gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-medium">{program.name}</h3>
          <StatusBadge tone={program.active ? 'verde' : 'neutro'} size="sm">
            {program.active ? 'Ativo' : 'Inativo'}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm text-marca">{item.category} — {item.name}</p>
        <p className="mt-2 text-sm">
          {program.scope === 'todos' ? 'Todos os cães no abrigo' : `${assignedDogs} cão${assignedDogs === 1 ? '' : 'es'} selecionado${assignedDogs === 1 ? '' : 's'}`}
        </p>
        <div className="mt-1 flex flex-wrap gap-x-4 text-sm">
          {program.defaultDose && <span>Dose: {program.defaultDose}</span>}
          {program.defaultFrequency && <span>Frequência: {program.defaultFrequency}</span>}
          {program.defaultIntervalDays && <span>Intervalo: {program.defaultIntervalDays} dias</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
        <Action onClick={onEdit} disabled={isPending} size="admin-row" variant="neutral-adaptive" icon="edit-pencil" className="min-h-11 w-full">
          Editar
        </Action>
        <Action
          onClick={onToggleActive}
          disabled={isPending}
          size="admin-row"
          variant={program.active ? 'secondary-adaptive' : 'primary-adaptive'}
          icon={program.active ? 'eye-closed' : 'eye'}
          className="min-h-11 w-full"
        >
          {program.active ? 'Desativar' : 'Ativar'}
        </Action>
      </div>
    </AdminListRow>
  )
}
