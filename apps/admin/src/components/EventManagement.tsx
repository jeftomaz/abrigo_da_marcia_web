import { useMemo, useState } from 'react'
import { Action, Icon, ImagePlaceholder, formatReservationContact } from '@abrigo/shared'
import type { EventReservation, FundraisingEvent, ReservationStatus } from '../events/events'
import { getEventPhotoUrl } from '../events/events'
import { StatusBadge } from './StatusBadge'

type EventManagementProps = {
  event: FundraisingEvent
  layout: 'mobile' | 'panel'
  onUpdateReservation: (id: string, changes: { receiptSaved?: boolean; status?: ReservationStatus }) => Promise<void> | void
  reservations: EventReservation[]
}

const RESERVATION_STATUS = {
  canceled: { label: 'Cancelado', classes: 'bg-cinza-medio text-cinza-claro' },
  delivered: { label: 'Entregue', classes: 'bg-marca-clara text-marca' },
  paid: { label: 'Pago', classes: 'bg-status-verde text-status-verde-texto' },
  reserved: { label: 'Reservado', classes: 'bg-status-amarelo text-status-amarelo-texto' },
} as const

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  if (!value) return 'Data não definida'
  return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
}

function productItemLabel(reservation: EventReservation) {
  return reservation.productItems.map((item) => {
    const options = Object.values(item.options).map((option) => `${option.variationName}: ${option.optionName}`)
    return [item.productName, ...options].join(' • ')
  }).join(' | ')
}

export function EventManagement({ event, layout, onUpdateReservation, reservations }: EventManagementProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | ''>('')
  const [actionError, setActionError] = useState('')
  const isPanel = layout === 'panel'
  const eventStatus = event.status === 'active'
    ? { label: 'Ativo', tone: 'verde' as const }
    : event.status === 'archived'
      ? { label: 'Arquivado', tone: 'neutro' as const }
      : { label: 'Encerrado', tone: 'amarelo' as const }
  const filteredReservations = useMemo(() => reservations.filter((reservation) => {
    const matchesSearch = `${reservation.name} ${reservation.contact}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
    return matchesSearch && (!statusFilter || reservation.status === statusFilter)
  }), [reservations, search, statusFilter])
  const paidTotal = reservations.filter((reservation) => reservation.status === 'paid' || reservation.status === 'delivered').reduce((total, reservation) => total + reservation.totalCents, 0)
  const reservedTotal = reservations.filter((reservation) => reservation.status === 'reserved').reduce((total, reservation) => total + reservation.totalCents, 0)
  const soldItems = reservations.filter((reservation) => reservation.status !== 'canceled').reduce((total, reservation) => total + (event.kind === 'raffle' ? reservation.numbers.length : reservation.productItems.length), 0)
  const activeReservations = reservations.filter((reservation) => reservation.status === 'reserved' || reservation.status === 'paid').length

  const updateReservation = async (id: string, changes: { receiptSaved?: boolean; status?: ReservationStatus }) => {
    setActionError('')
    try {
      await onUpdateReservation(id, changes)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível atualizar a reserva.')
    }
  }

  const exportCsv = () => {
    const rows = [
      ['Nome', 'Contato', 'Status', event.kind === 'raffle' ? 'Números' : 'Itens', 'Total', 'Expira em', 'Comprovante salvo'],
      ...reservations.map((reservation) => [
        reservation.name,
        formatReservationContact(reservation.contact),
        RESERVATION_STATUS[reservation.status].label,
        event.kind === 'raffle' ? reservation.numbers.join(' ') : productItemLabel(reservation),
        (reservation.totalCents / 100).toFixed(2),
        reservation.expiresAt,
        reservation.receiptSaved ? 'Sim' : 'Não',
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
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
          <span className="block text-lg leading-tight font-medium desk:text-xs">{label}</span>
          <strong className={`mt-5 block text-right text-3xl font-medium desk:mt-2 desk:text-left desk:text-xl ${tone}`}>{value}</strong>
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
              {event.gallery[0] ? <img src={getEventPhotoUrl(event.gallery[0])} alt="" className="size-20 shrink-0 rounded-2xl object-cover" /> : <ImagePlaceholder label={`Sem foto de ${event.title}`} className="size-20 shrink-0 rounded-2xl" />}
              <div className="min-w-0"><h2 className="truncate text-3xl font-medium">{event.title}</h2><StatusBadge tone={eventStatus.tone} size="sm" className="mt-2 px-5">{eventStatus.label}</StatusBadge></div>
            </div>
            <Action onClick={exportCsv} icon="upload" size="small" variant="neutral-adaptive" className="px-4 py-2 text-xs">Exportar CSV</Action>
          </div>
          <div className="mt-3 border-t border-cinza-medio pt-2 dark:border-cinza-claro">
            <h3 className="text-lg font-medium">Resumo</h3>
            <p className="text-sm text-cinza-medio dark:text-cinza-claro">{formatDate(event.startDate)} até {formatDate(event.endDate)} • reservas expiram em {event.reservationTtlMinutes || 'prazo padrão'} min</p>
          </div>
          <div className="mt-3">{statCards}</div>
        </>
      )}

      <div className={`${isPanel ? 'mt-3 border-t border-cinza-medio pt-2 dark:border-cinza-claro' : ''} grid grid-cols-2 items-center gap-3 sm:grid-cols-[auto_minmax(10rem,1fr)]`}>
        <h3 className="text-2xl font-medium desk:text-lg">Reservas</h3>
        <div className="relative min-w-0">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReservationStatus | '')} aria-label="Filtrar reservas por status" className="h-10 w-full appearance-none rounded-full bg-surface-raised pr-9 pl-4 text-sm text-on-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-marca desk:h-7 desk:bg-cinza-claro desk:text-xs dark:desk:bg-cinza-medio">
            <option value="">Todos os status</option><option value="reserved">Reservadas</option><option value="paid">Pagas</option><option value="canceled">Canceladas</option><option value="delivered">Entregues</option>
          </select>
          <Icon name="arrow-separate-vertical" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
        </div>
      </div>

      {!isPanel && <div className="mt-5">{statCards}</div>}
      <div className="relative mt-4 min-w-0">
        <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busca por nome, contato..." aria-label="Buscar reserva" className="h-10 w-full rounded-full bg-surface-raised pr-4 pl-12 text-on-surface-raised outline-none focus-visible:ring-2 focus-visible:ring-marca desk:h-7 desk:bg-cinza-claro desk:text-xs dark:desk:bg-cinza-medio" />
      </div>
      {actionError && <p role="alert" className="mt-3 text-sm font-medium text-marca">{actionError}</p>}

      <div className={`${isPanel ? 'mt-3' : 'mt-5'} flex flex-col gap-3`}>
        {filteredReservations.map((reservation) => {
          const status = RESERVATION_STATUS[reservation.status]
          return (
            <article key={reservation.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-3xl bg-surface-raised p-5 text-on-surface-raised desk:grid-cols-[minmax(8rem,1fr)_minmax(11rem,1.5fr)_8rem] desk:items-center desk:rounded-2xl desk:border-4 desk:border-cinza-claro desk:p-3 dark:desk:border-cinza-medio">
              <div className="min-w-0"><h4 className="line-clamp-2 text-xl leading-tight font-medium desk:text-sm">{reservation.name}</h4><p className="mt-2 truncate text-sm text-cinza-medio dark:text-cinza-claro desk:text-xs">{formatReservationContact(reservation.contact)}</p><p className="mt-1 text-xs">Expira: {new Date(reservation.expiresAt).toLocaleString('pt-BR')}</p></div>
              <div className="col-start-1 flex min-w-0 flex-wrap gap-1 desk:col-start-2 desk:row-start-1">
                {event.kind === 'raffle' ? reservation.numbers.map((number) => <span key={number} className="min-w-12 rounded-md bg-cinza-medio px-2 py-1 text-center text-xs text-cinza-claro">Nº {String(number).padStart(2, '0')}</span>) : <span className="text-sm">{productItemLabel(reservation)}</span>}
              </div>
              <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end gap-2 desk:col-start-3 desk:row-span-1 desk:items-center">
                <label className="relative"><span className={`block rounded-lg px-4 py-1 text-sm font-medium ${status.classes}`}>{status.label}</span>
                  <select value={reservation.status} disabled={reservation.status === 'canceled' || reservation.status === 'delivered'} onChange={(event) => void updateReservation(reservation.id, { status: event.target.value as ReservationStatus })} aria-label={`Alterar status da reserva de ${reservation.name}`} className="absolute inset-0 cursor-pointer opacity-0">
                    <option value={reservation.status}>{status.label}</option>
                    {reservation.status === 'reserved' && <><option value="paid">Pago</option><option value="canceled">Cancelado</option></>}
                    {reservation.status === 'paid' && <><option value="canceled">Cancelado</option>{event.status !== 'active' && <option value="delivered">Entregue</option>}</>}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={reservation.receiptSaved} onChange={(event) => void updateReservation(reservation.id, { receiptSaved: event.target.checked })} className="accent-marca" />Comprovante salvo</label>
                <strong className="text-sm">{formatMoney(reservation.totalCents)}</strong>
              </div>
            </article>
          )
        })}
        {filteredReservations.length === 0 && <p className="py-5 text-center">Nenhuma reserva encontrada.</p>}
      </div>
    </section>
  )
}
