import { useEffect, useMemo, useRef, useState } from 'react'
import { Action, Dialog } from '@abrigo/shared'
import { EventForm } from '../components/EventForm'
import { EventManagement } from '../components/EventManagement'
import { EventRow } from '../components/EventRow'
import type {
  EventDraft,
  EventReservation,
  EventStatus,
  FundraisingEvent,
  ReservationDraft,
} from '../events/events'
import { TEMPORARY_EVENTS, TEMPORARY_RESERVATIONS } from '../events/events'
import { useIsDesktop } from '../hooks/useIsDesktop'

type DrawResult = {
  name: string
  number: number
}

type EventConfirmation = {
  action: 'archive' | 'end' | 'remove'
  event: FundraisingEvent
}

export function Eventos() {
  const [events, setEvents] = useState(TEMPORARY_EVENTS)
  const [reservations, setReservations] = useState(TEMPORARY_RESERVATIONS)
  const [editingTarget, setEditingTarget] = useState<FundraisingEvent | null | undefined>(undefined)
  const [managingEventId, setManagingEventId] = useState<string | null>(null)
  const [drawTarget, setDrawTarget] = useState<FundraisingEvent | null>(null)
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null)
  const [eventConfirmation, setEventConfirmation] = useState<EventConfirmation | null>(null)
  const createdEventUrls = useRef(new Set<string>())
  const isDesktop = useIsDesktop()
  const isEditing = editingTarget !== undefined
  const managingEvent = events.find((event) => event.id === managingEventId) ?? null
  const hasDetail = isEditing || Boolean(managingEvent)
  const activeEvent = useMemo(() => events.find((event) => event.status === 'active'), [events])
  const displayedEvents = !isDesktop && managingEvent ? [managingEvent] : events

  useEffect(() => {
    const urls = createdEventUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const handleSave = async (draft: EventDraft) => {
    const gallery = draft.gallery.map((photo) => {
      if (!photo.file) return photo.previewUrl
      const url = URL.createObjectURL(photo.file)
      createdEventUrls.current.add(url)
      return url
    })
    editingTarget?.gallery.forEach((url) => {
      if (!gallery.includes(url) && createdEventUrls.current.delete(url)) URL.revokeObjectURL(url)
    })
    const prizeImage = draft.prizeImage?.file
      ? URL.createObjectURL(draft.prizeImage.file)
      : draft.prizeImage?.previewUrl ?? ''
    if (draft.prizeImage?.file) createdEventUrls.current.add(prizeImage)
    if (
      editingTarget?.prizeImage &&
      editingTarget.prizeImage !== prizeImage &&
      createdEventUrls.current.delete(editingTarget.prizeImage)
    ) URL.revokeObjectURL(editingTarget.prizeImage)
    const savedEvent: FundraisingEvent = {
      ...draft,
      id: draft.id ?? crypto.randomUUID(),
      status: draft.status ?? 'draft',
      gallery,
      prizeImage,
    }
    setEvents((current) =>
      draft.id
        ? current.map((event) => (event.id === draft.id ? savedEvent : event))
        : [savedEvent, ...current],
    )
    setEditingTarget(undefined)
  }

  const handleRemove = (event: FundraisingEvent) => {
    if (event.status !== 'draft' && event.status !== 'archived') return
    event.gallery.forEach((url) => {
      if (createdEventUrls.current.delete(url)) URL.revokeObjectURL(url)
    })
    if (event.prizeImage && createdEventUrls.current.delete(event.prizeImage)) {
      URL.revokeObjectURL(event.prizeImage)
    }
    setEvents((current) => current.filter((item) => item.id !== event.id))
    setReservations((current) => current.filter((reservation) => reservation.eventId !== event.id))
    if (editingTarget?.id === event.id) setEditingTarget(undefined)
    if (managingEventId === event.id) setManagingEventId(null)
  }

  const handleSetStatus = (event: FundraisingEvent, status: EventStatus) => {
    if (status === 'active' && activeEvent && activeEvent.id !== event.id) {
      window.alert('Encerre o evento ativo antes de publicar ou reativar outro evento.')
      return
    }
    setEvents((current) => current.map((item) => (item.id === event.id ? { ...item, status } : item)))
  }

  const confirmEventAction = () => {
    if (!eventConfirmation) return
    const { action, event } = eventConfirmation
    if (action === 'end') handleSetStatus(event, 'ended')
    if (action === 'archive') handleSetStatus(event, 'archived')
    if (action === 'remove') handleRemove(event)
    setEventConfirmation(null)
  }

  const handleSaveReservation = (
    event: FundraisingEvent,
    draft: ReservationDraft,
    currentReservation: EventReservation | null,
  ) => {
    const savedReservation: EventReservation = {
      ...draft,
      eventId: event.id,
      id: draft.id ?? crypto.randomUUID(),
      receiptSaved: currentReservation?.receiptSaved ?? false,
      status: currentReservation?.status ?? 'reserved',
    }
    setReservations((current) =>
      currentReservation
        ? current.map((reservation) => reservation.id === currentReservation.id ? savedReservation : reservation)
        : [...current, savedReservation],
    )
  }

  const openManagement = (event: FundraisingEvent) => {
    setEditingTarget(undefined)
    setManagingEventId((current) => current === event.id ? null : event.id)
  }

  const openEditor = (event: FundraisingEvent | null) => {
    setManagingEventId(null)
    setEditingTarget(event)
  }

  const runDraw = () => {
    if (!drawTarget) return
    const paidReservations = reservations.filter(
      (reservation) => reservation.eventId === drawTarget.id && reservation.status === 'paid',
    )
    const entries = paidReservations.flatMap((reservation) =>
      reservation.numbers.map((number) => ({ name: reservation.name, number })),
    )
    if (entries.length === 0) return
    const random = new Uint32Array(1)
    crypto.getRandomValues(random)
    setDrawResult(entries[random[0] % entries.length])
  }

  const formTitle = editingTarget ? 'Editar Evento' : 'Novo Evento'

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div
        className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${
          hasDetail
            ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(36rem,45rem)] desk:justify-between'
            : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'
        }`}
      >
        <section aria-label="Resumo de eventos" className="grid grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)] gap-3">
          <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised">
            <strong className="block text-4xl font-medium">{events.filter((event) => event.status === 'active').length}</strong>
            <span className="font-medium">Total de eventos</span>
          </div>
          <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised">
            <strong className="block truncate text-2xl font-medium text-marca">{activeEvent?.title ?? 'Nenhum evento'}</strong>
            <span className="font-medium">{activeEvent ? 'Evento ativo' : 'Sem evento ativo'}</span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-4xl font-medium">Eventos</h1>
            <Action onClick={() => openEditor(null)} icon="keyframe-plus-in-solid" size="small" variant="primary-adaptive" className="shrink-0 px-5">
              Novo Evento
            </Action>
          </div>

          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 desk:gap-3">
            {displayedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                isEditing={editingTarget?.id === event.id}
                isManaging={managingEventId === event.id}
                onArchive={() => setEventConfirmation({ action: 'archive', event })}
                onDraw={() => {
                  setDrawTarget(event)
                  setDrawResult(null)
                }}
                onEnd={() => setEventConfirmation({ action: 'end', event })}
                onEdit={() => openEditor(event)}
                onOpenReservations={() => openManagement(event)}
                onRemove={() => setEventConfirmation({ action: 'remove', event })}
                onSetStatus={(status) => handleSetStatus(event, status)}
              />
            ))}
            {events.length === 0 && <p className="py-6 text-center">Nenhum evento cadastrado.</p>}
          </div>

          {managingEvent && !isDesktop && (
            <EventManagement
              event={managingEvent}
              layout="mobile"
              reservations={reservations.filter((reservation) => reservation.eventId === managingEvent.id)}
              onRemoveReservation={(reservation) => setReservations((current) => current.filter((item) => item.id !== reservation.id))}
              onSaveReservation={(draft, reservation) => handleSaveReservation(managingEvent, draft, reservation)}
              onUpdateReservation={(id, changes) => setReservations((current) => current.map((reservation) => reservation.id === id ? { ...reservation, ...changes } : reservation))}
            />
          )}
        </section>

        {hasDetail && isDesktop && (
          <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            {isEditing ? (
              <EventForm
                key={editingTarget?.id ?? 'new'}
                event={editingTarget ?? null}
                layout="panel"
                title={formTitle}
                onCancel={() => setEditingTarget(undefined)}
                onSave={handleSave}
              />
            ) : managingEvent ? (
              <EventManagement
                event={managingEvent}
                layout="panel"
                reservations={reservations.filter((reservation) => reservation.eventId === managingEvent.id)}
                onRemoveReservation={(reservation) => setReservations((current) => current.filter((item) => item.id !== reservation.id))}
                onSaveReservation={(draft, reservation) => handleSaveReservation(managingEvent, draft, reservation)}
                onUpdateReservation={(id, changes) => setReservations((current) => current.map((reservation) => reservation.id === id ? { ...reservation, ...changes } : reservation))}
              />
            ) : null}
          </aside>
        )}
      </div>

      {isEditing && !isDesktop && (
        <Dialog
          ariaLabel={formTitle}
          onClose={() => setEditingTarget(undefined)}
          className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-14"
        >
          <EventForm
            key={editingTarget?.id ?? 'new'}
            event={editingTarget ?? null}
            layout="modal"
            title={formTitle}
            onCancel={() => setEditingTarget(undefined)}
            onSave={handleSave}
          />
        </Dialog>
      )}

      {eventConfirmation && (
        <Dialog
          ariaLabel={
            eventConfirmation.action === 'end'
              ? 'Encerrar evento'
              : eventConfirmation.action === 'archive'
                ? 'Arquivar evento'
                : 'Remover evento'
          }
          onClose={() => setEventConfirmation(null)}
          className="w-full max-w-[46rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised sm:p-12"
        >
          <h2 className="text-4xl font-medium text-marca">
            {eventConfirmation.action === 'end'
              ? 'Encerrar Evento'
              : eventConfirmation.action === 'archive'
                ? 'Arquivar Evento'
                : eventConfirmation.event.status === 'draft'
                  ? 'Remover Rascunho'
                  : 'Remover Evento'}
          </h2>
          <h3 className="mt-6 text-3xl font-medium">{eventConfirmation.event.title}</h3>
          {eventConfirmation.action === 'end' && (
            <p className="mt-3 text-lg">
              Ao encerrar este evento, novas reservas deixam de ser aceitas. Os dados e a gestão das reservas serão mantidos.
            </p>
          )}
          {eventConfirmation.action === 'archive' && (
            <p className="mt-3 text-lg">
              Ao arquivar este evento, ele será removido da visualização pública, mas seus dados permanecerão no banco de dados. Somente eventos arquivados e rascunhos podem ser removidos definitivamente.
            </p>
          )}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'draft' && (
            <p className="mt-3 text-lg">
              O rascunho e todos os dados associados a ele serão apagados do banco de dados.
            </p>
          )}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'archived' && (
            <p className="mt-3 text-lg">
              O evento e seus dados serão apagados do banco de dados. Uma cópia será enviada ao e-mail definido nas Configurações, e o administrador responsável pela remoção ficará registrado.
            </p>
          )}
          <div className="mt-10 flex gap-4">
            <Action
              onClick={() => setEventConfirmation(null)}
              size="small"
              variant="secondary-adaptive"
              className="w-32 shrink-0"
            >
              Cancelar
            </Action>
            <Action
              onClick={confirmEventAction}
              icon={eventConfirmation.action === 'archive' ? 'archive' : eventConfirmation.action === 'end' ? 'white-flag-solid' : 'trash-solid'}
              size="small"
              variant="primary-adaptive"
              className="min-w-0 flex-1"
            >
              {eventConfirmation.action === 'end'
                ? 'Encerrar Evento'
                : eventConfirmation.action === 'archive'
                  ? 'Arquivar Evento'
                  : 'Remover Evento'}
            </Action>
          </div>
        </Dialog>
      )}

      {drawTarget && (
        <Dialog
          ariaLabel="Sortear rifa"
          onClose={() => setDrawTarget(null)}
          className="w-full max-w-[34rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised"
        >
          <h2 className="text-3xl font-medium text-marca">Sortear Rifa</h2>
          <p className="mt-4 text-lg">O sorteio considera somente números de reservas marcadas como pagas.</p>
          {drawResult ? (
            <div className="mt-6 rounded-2xl bg-cinza-claro p-6 text-center text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
              <span className="block text-sm">Número sorteado</span>
              <strong className="block text-5xl text-marca">{String(drawResult.number).padStart(2, '0')}</strong>
              <span className="mt-2 block text-xl">{drawResult.name}</span>
            </div>
          ) : (
            <p className="mt-6 text-center text-sm text-cinza-medio dark:text-cinza-claro">
              {reservations.some((reservation) => reservation.eventId === drawTarget.id && reservation.status === 'paid') ? 'Pronto para sortear.' : 'Nenhuma reserva paga disponível.'}
            </p>
          )}
          <div className="mt-6 flex gap-4">
            <Action onClick={() => setDrawTarget(null)} size="small" variant="secondary-adaptive" className="w-28 shrink-0">Cancelar</Action>
            <Action onClick={runDraw} disabled={!reservations.some((reservation) => reservation.eventId === drawTarget.id && reservation.status === 'paid')} icon="dice-five" size="small" variant="primary-adaptive" className="min-w-0 flex-1">
              {drawResult ? 'Sortear novamente' : 'Sortear'}
            </Action>
          </div>
        </Dialog>
      )}
    </main>
  )
}
