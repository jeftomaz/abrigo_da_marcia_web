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
  onQuickRecord?: () => void
  program: CareProgram
  recordedToday?: boolean
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
  onQuickRecord,
  program,
  recordedToday = false,
  records = [],
  showDog = true,
}: CareAssignmentCardProps) {
  const canRecordDetails = program.active
    && item.active
    && dog.status === 'disponivel'
    && !['suspenso', 'dispensado'].includes(assignment.status)
  const canQuickRecord = canRecordDetails
    && ['pendente', 'em_andamento'].includes(assignment.status)

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
            {assignment.nextDueAt ? `Próxima: ${formatDateTime(assignment.nextDueAt)}` : 'Sem próxima data'}
          </span>
          {assignment.dose && <span>Dose: {assignment.dose}</span>}
          {item.frequencyLabel && <span>Frequência: {item.frequencyLabel}</span>}
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
      <div className="grid gap-2">
        {onQuickRecord && (
          <label className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium ${recordedToday ? 'bg-marca-clara text-marca-escura dark:bg-marca-escura dark:text-marca-clara' : 'bg-cinza-claro dark:bg-cinza-medio'}`}>
            <input
              type="checkbox"
              checked={recordedToday}
              disabled={!canQuickRecord || recordedToday}
              onChange={(event) => {
                if (event.target.checked) onQuickRecord()
              }}
              className="size-5 shrink-0 accent-marca disabled:opacity-70"
            />
            <span>{recordedToday ? 'Realizado hoje' : 'Marcar como realizado'}</span>
          </label>
        )}
        <Action
          onClick={onRecord}
          disabled={!canRecordDetails}
          size="admin-row"
          variant={onQuickRecord ? 'neutral-adaptive' : 'primary-adaptive'}
          icon="plus-circle-solid"
          className="min-h-11 w-full sm:w-auto"
        >
          {onQuickRecord ? 'Registrar detalhes' : 'Registrar'}
        </Action>
      </div>
    </AdminListRow>
  )
}
