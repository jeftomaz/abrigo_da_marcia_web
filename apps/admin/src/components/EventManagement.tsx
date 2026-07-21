import { useMemo, useState } from 'react'
import { Action, Dialog, Icon } from '@abrigo/shared'
import type {
  EventReservation,
  FundraisingEvent,
  ReservationDraft,
  ReservationStatus,
} from '../events/events'
import { StatusBadge } from './StatusBadge'
import { ReservationForm } from './ReservationForm'

type EventManagementProps = {
  event: FundraisingEvent
  layout: 'mobile' | 'panel'
  onRemoveReservation: (reservation: EventReservation) => void
  onSaveReservation: (draft: ReservationDraft, reservation: EventReservation | null) => void
  onUpdateReservation: (id: string, changes: Partial<EventReservation>) => void
  reservations: EventReservation[]
}

function numberValue(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0
}

function reservationTotal(event: FundraisingEvent, reservation: EventReservation) {
  return event.kind === 'raffle'
    ? reservation.numbers.length * numberValue(event.raffleNumberPrice)
    : reservation.productQuantity * numberValue(event.productPrice)
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  if (!value) return 'Data não definida'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

const RESERVATION_STATUS = {
  canceled: { label: 'Cancelado', classes: 'bg-cinza-medio text-cinza-claro' },
  delivered: { label: 'Entregue', classes: 'bg-marca-clara text-marca' },
  paid: { label: 'Pago', classes: 'bg-status-verde text-status-verde-texto' },
  reserved: { label: 'Reservado', classes: 'bg-status-amarelo text-status-amarelo-texto' },
} as const

export function EventManagement({
  event,
  layout,
  onRemoveReservation,
  onSaveReservation,
  onUpdateReservation,
  reservations,
}: EventManagementProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | ''>('')
  const [reservationFormTarget, setReservationFormTarget] = useState<EventReservation | null | undefined>()
  const [removalTarget, setRemovalTarget] = useState<EventReservation | null>(null)
  const isPanel = layout === 'panel'
  const eventStatus = event.status === 'active'
    ? { label: 'Ativo', tone: 'verde' as const }
    : event.status === 'archived'
      ? { label: 'Arquivado', tone: 'neutro' as const }
      : { label: 'Encerrado', tone: 'amarelo' as const }
  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => {
      const matchesSearch = `${reservation.name} ${reservation.contact}`
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR'))
      return matchesSearch && (!statusFilter || reservation.status === statusFilter)
    }),
    [reservations, search, statusFilter],
  )
  const paidTotal = reservations
    .filter((reservation) => reservation.status === 'paid' || reservation.status === 'delivered')
    .reduce((total, reservation) => total + reservationTotal(event, reservation), 0)
  const reservedTotal = reservations
    .filter((reservation) => reservation.status === 'reserved')
    .reduce((total, reservation) => total + reservationTotal(event, reservation), 0)
  const soldItems = reservations.filter((reservation) => reservation.status !== 'canceled').reduce(
    (total, reservation) => total + (event.kind === 'raffle' ? reservation.numbers.length : reservation.productQuantity),
    0,
  )
  const activeReservations = reservations.filter(
    (reservation) => reservation.status === 'reserved' || reservation.status === 'paid',
  ).length
  const unavailableNumbers = new Set(
    reservations
      .filter((reservation) => reservation.id !== reservationFormTarget?.id && reservation.status !== 'canceled')
      .flatMap((reservation) => reservation.numbers),
  )
  const searchField = (
    <div className="relative min-w-0">
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60" />
      <input
        value={search}
        onChange={(changeEvent) => setSearch(changeEvent.target.value)}
        placeholder="Busca por nome, contato..."
        aria-label="Buscar reserva"
        className="h-10 w-full rounded-full bg-surface-raised pr-4 pl-12 text-on-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-marca desk:h-7 desk:bg-cinza-claro desk:text-xs dark:desk:bg-cinza-medio"
      />
    </div>
  )

  const exportCsv = () => {
    const rows = [
      ['Nome', 'Contato', 'Status', event.kind === 'raffle' ? 'Números' : 'Itens', 'Total', 'Comprovante salvo'],
      ...reservations.map((reservation) => [
        reservation.name,
        reservation.contact,
        RESERVATION_STATUS[reservation.status].label,
        event.kind === 'raffle'
          ? reservation.numbers.join(' ')
          : `${reservation.productQuantity} ${Object.entries(reservation.productOptions).map(([name, option]) => `${name}: ${option}`).join(' • ')}`,
        reservationTotal(event, reservation).toFixed(2),
        reservation.receiptSaved ? 'Sim' : 'Não',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${event.title.toLocaleLowerCase('pt-BR').replaceAll(' ', '-')}-reservas.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const statCards = (
    <div className={`grid grid-cols-2 gap-3 ${isPanel ? 'desk:grid-cols-4' : ''}`}>
      {[
        ['Reservas ativas', String(activeReservations), ''],
        [event.kind === 'raffle' ? 'Números vendidos' : 'Itens reservados', `${soldItems}/${event.kind === 'raffle' ? event.raffleTotalNumbers : '∞'}`, ''],
        ['Reservado', formatMoney(reservedTotal), 'text-status-amarelo'],
        ['Pago', formatMoney(paidTotal), 'text-status-verde'],
      ].map(([label, value, tone]) => (
        <div key={label} className="min-h-28 rounded-2xl bg-surface-raised p-4 text-on-surface-raised desk:min-h-16 desk:bg-cinza-claro desk:p-3 dark:desk:bg-cinza-medio">
          <span className="block text-lg font-medium leading-tight desk:text-xs">{label}</span>
          <strong className={`mt-5 block text-right text-3xl font-medium desk:mt-2 desk:text-left desk:text-xl ${tone}`}>
            {value}
          </strong>
        </div>
      ))}
    </div>
  )

  return (
    <section className={isPanel ? '' : 'border-t-2 border-cinza-claro pt-5 dark:border-cinza-claro'}>
      {isPanel && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <img src={event.gallery[0]} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0">
                <h2 className="truncate text-3xl font-medium">{event.title}</h2>
                <StatusBadge tone={eventStatus.tone} size="sm" className="mt-2 px-5">{eventStatus.label}</StatusBadge>
              </div>
            </div>
            <Action onClick={exportCsv} icon="upload" size="small" variant="neutral-adaptive" className="px-4 py-2 text-xs">
              Exportar CSV
            </Action>
          </div>
          <div className="mt-3 border-t border-cinza-medio pt-2 dark:border-cinza-claro">
            <h3 className="text-lg font-medium">Resumo</h3>
            <p className="text-sm text-cinza-medio dark:text-cinza-claro">
              {formatDate(event.startDate)} até {formatDate(event.endDate)} • {event.kind === 'raffle' ? `${event.raffleTotalNumbers} números a ${formatMoney(numberValue(event.raffleNumberPrice))}` : `Produtos a partir de ${formatMoney(numberValue(event.productPrice))}`}
            </p>
          </div>
          <div className="mt-3">{statCards}</div>
        </>
      )}

      <div className={`${isPanel ? 'mt-3 border-t border-cinza-medio pt-2 dark:border-cinza-claro' : ''} grid grid-cols-2 items-center gap-3 sm:grid-cols-[auto_minmax(10rem,1fr)_auto]`}>
        <h3 className="col-span-2 text-2xl font-medium sm:col-span-1 desk:text-lg">Reservas</h3>
        <div className="relative min-w-0 sm:justify-self-center">
          <select
            value={statusFilter}
            onChange={(changeEvent) => setStatusFilter(changeEvent.target.value as ReservationStatus | '')}
            aria-label="Filtrar reservas por status"
            className="h-10 w-full appearance-none rounded-full bg-surface-raised pr-9 pl-4 text-sm text-on-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-marca desk:h-7 desk:bg-cinza-claro desk:text-xs dark:desk:bg-cinza-medio"
          >
            <option value="">Todos os status</option>
            <option value="reserved">Reservadas</option>
            <option value="paid">Pagas</option>
            <option value="canceled">Canceladas</option>
            <option value="delivered">Entregues</option>
          </select>
          <Icon name="arrow-separate-vertical" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
        </div>
        <Action
          onClick={() => setReservationFormTarget(null)}
          disabled={event.status !== 'active'}
          icon="keyframe-plus-in-solid"
          size="small"
          variant="primary-adaptive"
          className="w-full min-w-0 px-3 sm:col-start-3 sm:row-start-1 sm:px-5"
        >
          Nova Reserva
        </Action>
      </div>

      {isPanel && <div className="mt-2">{searchField}</div>}
      {!isPanel && <div className="mt-5">{statCards}</div>}
      {!isPanel && <div className="mt-5">{searchField}</div>}

      <div className={`${isPanel ? 'mt-3 rounded-3xl border-4 border-cinza-claro p-1 dark:border-cinza-medio' : 'mt-5'} flex flex-col gap-3`}>
        {filteredReservations.map((reservation) => {
          const status = RESERVATION_STATUS[reservation.status]
          return (
            <article
              key={reservation.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-3xl bg-surface-raised p-5 text-on-surface-raised desk:grid-cols-[minmax(8rem,1fr)_minmax(11rem,1.5fr)_7rem_auto] desk:items-center desk:rounded-2xl desk:p-3"
            >
              <div className="min-w-0">
                <h4 className="line-clamp-2 text-xl font-medium leading-tight desk:text-sm">{reservation.name}</h4>
                <p className="mt-2 truncate text-sm text-cinza-medio dark:text-cinza-claro desk:text-xs">{reservation.contact}</p>
              </div>
              <div className="col-start-1 flex min-w-0 flex-wrap gap-1 desk:col-start-2 desk:row-start-1">
                {event.kind === 'raffle' ? reservation.numbers.map((number) => (
                  <span key={number} className="min-w-12 rounded-md bg-cinza-medio px-2 py-1 text-center text-xs text-cinza-claro dark:bg-cinza-claro dark:text-cinza-escuro desk:min-w-10 desk:py-0.5 desk:text-[0.625rem]">
                    Nº {String(number).padStart(2, '0')}
                  </span>
                )) : (
                  <span className="text-sm">
                    {reservation.productQuantity} unidade(s)
                    {Object.entries(reservation.productOptions).map(([name, option]) => ` • ${name}: ${option}`).join('')}
                  </span>
                )}
              </div>
              <div className="col-start-1 flex flex-col items-start gap-2 desk:col-start-3 desk:row-start-1 desk:items-center">
                <label className="relative">
                  <span className={`block rounded-lg px-4 py-1 text-sm font-medium ${status.classes}`}>
                    {status.label}
                  </span>
                  <select
                    value={reservation.status}
                    onChange={(changeEvent) => onUpdateReservation(reservation.id, { status: changeEvent.target.value as ReservationStatus })}
                    aria-label={`Alterar status da reserva de ${reservation.name}`}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    <option value="reserved">Reservado</option>
                    <option value="paid">Pago</option>
                    <option value="canceled">Cancelado</option>
                    <option value="delivered">Entregue</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={reservation.receiptSaved}
                    onChange={(changeEvent) => onUpdateReservation(reservation.id, { receiptSaved: changeEvent.target.checked })}
                    className="accent-marca"
                  />
                  Comprovante salvo
                </label>
              </div>
              <div className="col-start-2 row-span-3 row-start-1 flex flex-col justify-center gap-3 desk:col-start-4 desk:row-span-1 desk:flex-row desk:flex-wrap">
                <Action onClick={() => setReservationFormTarget(reservation)} icon="edit-pencil" size="small" variant="neutral-adaptive" className="px-4 py-3 desk:py-2">
                  Editar
                </Action>
                <Action onClick={() => setRemovalTarget(reservation)} icon="trash-solid" size="small" variant="neutral-adaptive" className="px-4 py-3 desk:py-2">
                  Remover
                </Action>
              </div>
            </article>
          )
        })}
        {filteredReservations.length === 0 && <p className="py-5 text-center">Nenhuma reserva encontrada.</p>}
      </div>

      {reservationFormTarget !== undefined && (
        <Dialog
          ariaLabel={reservationFormTarget ? 'Editar reserva' : 'Nova reserva'}
          onClose={() => setReservationFormTarget(undefined)}
          className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-12"
        >
          <ReservationForm
            event={event}
            reservation={reservationFormTarget}
            unavailableNumbers={unavailableNumbers}
            onCancel={() => setReservationFormTarget(undefined)}
            onSave={(draft) => {
              onSaveReservation(draft, reservationFormTarget)
              setReservationFormTarget(undefined)
            }}
          />
        </Dialog>
      )}

      {removalTarget && (
        <Dialog
          ariaLabel="Remover reserva"
          onClose={() => setRemovalTarget(null)}
          className="w-full max-w-[46rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised sm:p-12"
        >
          <h2 className="text-4xl font-medium text-marca">Remover Reserva</h2>
          <h3 className="mt-6 text-3xl font-medium">Reserva</h3>
          <p className="mt-1 text-xl">Nome: {removalTarget.name}</p>
          <p className="text-xl">
            {event.kind === 'raffle' ? `Números escolhidos: ${removalTarget.numbers.join(', ')}` : `Itens: ${removalTarget.productQuantity}`}
          </p>
          <p className="mt-2 text-lg">Total: {formatMoney(reservationTotal(event, removalTarget))}</p>
          <div className="mt-10 flex gap-4">
            <Action onClick={() => setRemovalTarget(null)} size="small" variant="secondary-adaptive" className="w-36 shrink-0">Cancelar</Action>
            <Action
              onClick={() => {
                onRemoveReservation(removalTarget)
                setRemovalTarget(null)
              }}
              icon="trash-solid"
              size="small"
              variant="primary-adaptive"
              className="min-w-0 flex-1"
            >
              Remover Reserva
            </Action>
          </div>
        </Dialog>
      )}
    </section>
  )
}
