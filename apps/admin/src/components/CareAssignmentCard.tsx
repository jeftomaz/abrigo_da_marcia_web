import {
  Action,
  CARE_RECORD_TYPE_LABELS,
  CARE_STATUS_LABELS,
} from '@abrigo/shared'
import type {
  CareItem,
  CareProgram,
  CareRecord,
  Dog,
  DogCare,
} from '@abrigo/shared'
import { AdminListRow } from './AdminListRow'
import { StatusBadge, type StatusTone } from './StatusBadge'

type CareAssignmentCardProps = {
  assignment: DogCare
  dog: Dog
  item: CareItem
  onRecord: () => void
  program: CareProgram
  records?: CareRecord[]
  showDog?: boolean
}

const STATUS_TONE: Record<DogCare['status'], StatusTone> = {
  pendente: 'amarelo',
  em_andamento: 'verde',
  concluido: 'marca-escura',
  suspenso: 'neutro',
  dispensado: 'neutro',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function CareAssignmentCard({
  assignment,
  dog,
  item,
  onRecord,
  program,
  records = [],
  showDog = true,
}: CareAssignmentCardProps) {
  const canRecord = program.active
    && item.active
    && dog.status === 'disponivel'
    && !['suspenso', 'dispensado'].includes(assignment.status)

  return (
    <AdminListRow
      audit={assignment.audit}
      isEditing={false}
      className="grid min-w-0 gap-3 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {showDog && <h3 className="text-lg font-medium">{dog.name}</h3>}
          <StatusBadge tone={STATUS_TONE[assignment.status]} size="sm">
            {CARE_STATUS_LABELS[assignment.status]}
          </StatusBadge>
        </div>
        <p className={`${showDog ? 'mt-1' : ''} font-medium text-marca`}>{item.name}</p>
        <p className="mt-0.5 text-sm">{program.name}</p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            {assignment.nextDueOn ? `Próxima: ${formatDate(assignment.nextDueOn)}` : 'Sem próxima data'}
          </span>
          {assignment.dose && <span>Dose: {assignment.dose}</span>}
          {assignment.frequency && <span>Frequência: {assignment.frequency}</span>}
        </div>
        {assignment.exceptionReason && (
          <p className="mt-2 text-sm">Motivo: {assignment.exceptionReason}</p>
        )}
        {records.slice(0, 3).map((record) => (
          <p key={record.id} className="mt-2 border-l-2 border-marca pl-2 text-xs">
            {formatDateTime(record.occurredAt)} — {CARE_RECORD_TYPE_LABELS[record.type]}
            {record.notes ? `: ${record.notes}` : ''}
          </p>
        ))}
      </div>
      <Action
        onClick={onRecord}
        disabled={!canRecord}
        size="admin-row"
        variant="primary-adaptive"
        icon="plus-circle-solid"
        className="min-h-11 w-full sm:w-auto"
      >
        Registrar
      </Action>
    </AdminListRow>
  )
}
