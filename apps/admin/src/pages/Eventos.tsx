import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Action,
  Dialog,
  getEventErrorMessage,
  getEventPublicationError,
  toEditableEventDraft,
  useAdminEvents,
  useDeleteEvent,
  useEventReservations,
  useEventSettings,
  useSaveEvent,
  useSaveEventDraft,
  useUpdateEventReservation,
  useUpdateEventStatus,
} from '@abrigo/shared'
import { useNavigate } from 'react-router-dom'
import { EventForm } from '../components/EventForm'
import type { EventFormHandle } from '../components/EventForm'
import { EventManagement } from '../components/EventManagement'
import { EventRow } from '../components/EventRow'
import type { EventDraft, EventStatus, FundraisingEvent, ReservationStatus } from '../events/events'
import { useIsDesktop } from '../hooks/useIsDesktop'

type EventConfirmation = { action: 'archive' | 'end' | 'publish' | 'remove'; event: FundraisingEvent }

export function Eventos() {
  const { data: events = [], error: loadError, isLoading } = useAdminEvents()
  const saveEvent = useSaveEvent()
  const saveEventDraft = useSaveEventDraft()
  const updateStatus = useUpdateEventStatus()
  const deleteEvent = useDeleteEvent()
  const [editingTarget, setEditingTarget] = useState<FundraisingEvent | null | undefined>(undefined)
  const [managingEventId, setManagingEventId] = useState<string | null>(null)
  const [eventConfirmation, setEventConfirmation] = useState<EventConfirmation | null>(null)
  const [actionError, setActionError] = useState('')
  const eventFormRef = useRef<EventFormHandle>(null)
  const editorCardRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const isEditing = editingTarget !== undefined
  const managingEvent = events.find((event) => event.id === managingEventId) ?? null
  const reservationsQuery = useEventReservations(managingEventId ?? '')
  const updateReservation = useUpdateEventReservation(managingEventId ?? '')
  const hasDetail = isEditing || Boolean(managingEvent)
  const activeEvent = useMemo(() => events.find((event) => event.status === 'active'), [events])
  const { data: eventSettings } = useEventSettings()
  const displayedEvents = !isDesktop && managingEvent ? [managingEvent] : events

  const handleSave = async (draft: EventDraft) => {
    await saveEvent.mutateAsync(draft)
    setEditingTarget(undefined)
  }

  const handleAutoSave = async (draft: EventDraft) => {
    await saveEventDraft.mutateAsync(draft)
  }

  const handleSetStatus = async (event: FundraisingEvent, status: EventStatus) => {
    setActionError('')
    try {
      if (status === 'active') {
        const publicationError = getEventPublicationError(event, {
          activeEventId: activeEvent?.id,
          defaultMaxProductUnits: eventSettings?.defaultMaxProductUnits,
        })
        if (publicationError) {
          setActionError(`Não foi possível publicar “${event.title || 'evento sem título'}”: ${publicationError}`)
          return false
        }
        const savedEvent = await saveEvent.mutateAsync(toEditableEventDraft(event))
        if (!savedEvent) throw new Error('O evento não foi encontrado após a validação.')
      }
      await updateStatus.mutateAsync({ id: event.id, status })
      return true
    } catch (error) {
      setActionError(getEventErrorMessage(error, 'Não foi possível alterar o status.'))
      return false
    }
  }

  const confirmEventAction = async () => {
    if (!eventConfirmation) return
    const { action, event } = eventConfirmation
    setActionError('')
    try {
      if (action === 'publish' && !await handleSetStatus(event, 'active')) return
      if (action === 'end' && !await handleSetStatus(event, 'ended')) return
      if (action === 'archive' && !await handleSetStatus(event, 'archived')) return
      if (action === 'remove') await deleteEvent.mutateAsync({ event })
      if (managingEventId === event.id) setManagingEventId(null)
      if (editingTarget?.id === event.id) setEditingTarget(undefined)
      setEventConfirmation(null)
    } catch (error) {
      setActionError(getEventErrorMessage(error, 'A ação não foi concluída.'))
    }
  }

  const openManagement = (event: FundraisingEvent) => {
    setEditingTarget(undefined)
    setManagingEventId((current) => current === event.id ? null : event.id)
  }

  const openEditor = (event: FundraisingEvent | null) => {
    setManagingEventId(null)
    setEditingTarget(event)
  }

  const updateManagedReservation = async (id: string, changes: { receiptSaved?: boolean; status?: ReservationStatus }) => {
    await updateReservation.mutateAsync({ id, ...changes })
  }

  const formTitle = editingTarget ? 'Editar Evento' : 'Novo Evento'
  const isConfirming = updateStatus.isPending || deleteEvent.isPending
  const dismissEditor = () => void eventFormRef.current?.dismiss()

  useEffect(() => {
    if (!isDesktop || !isEditing) return
    const handleOutsideClick = (clickEvent: MouseEvent) => {
      if (!editorCardRef.current || editorCardRef.current.contains(clickEvent.target as Node)) return
      clickEvent.preventDefault()
      clickEvent.stopPropagation()
      void eventFormRef.current?.dismiss()
    }
    document.addEventListener('click', handleOutsideClick, true)
    return () => document.removeEventListener('click', handleOutsideClick, true)
  }, [isDesktop, isEditing])

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${hasDetail ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(36rem,45rem)] desk:justify-between' : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'}`}>
        <section aria-label="Resumo de eventos">
          <div className="grid grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)] gap-3">
            <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised"><strong className="block text-4xl font-medium">{events.length}</strong><span className="font-medium">Total de eventos</span></div>
            <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised"><strong className="block truncate text-2xl font-medium text-marca">{activeEvent?.title ?? 'Nenhum evento'}</strong><span className="font-medium">{activeEvent ? 'Evento ativo' : 'Sem evento ativo'}</span></div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-4"><h1 className="text-4xl font-medium">Eventos</h1><Action onClick={() => openEditor(null)} icon="keyframe-plus-in-solid" size="small" variant="primary-adaptive" className="shrink-0 px-5">Novo Evento</Action></div>
          {isLoading && <p className="py-6 text-center">Carregando eventos...</p>}
          {loadError && <p role="alert" className="py-6 text-center text-marca">Não foi possível carregar os eventos.</p>}
          {actionError && <p role="alert" className="text-sm font-medium text-marca">{actionError}</p>}
          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 desk:gap-3">
            {displayedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                isEditing={editingTarget?.id === event.id}
                isManaging={managingEventId === event.id}
                onArchive={() => setEventConfirmation({ action: 'archive', event })}
                onDraw={() => navigate(`/eventos/${event.id}/sorteio`)}
                onEnd={() => setEventConfirmation({ action: 'end', event })}
                onEdit={() => openEditor(event)}
                onOpenReservations={() => openManagement(event)}
                onRemove={() => setEventConfirmation({ action: 'remove', event })}
                onSetStatus={(status) => status === 'active' ? setEventConfirmation({ action: 'publish', event }) : void handleSetStatus(event, status)}
              />
            ))}
            {!isLoading && events.length === 0 && <p className="py-6 text-center">Nenhum evento cadastrado.</p>}
          </div>
          {managingEvent && !isDesktop && (reservationsQuery.isLoading ? <p role="status">Carregando reservas...</p> : reservationsQuery.error ? <p role="alert" className="text-marca">Não foi possível carregar as reservas.</p> : <EventManagement event={managingEvent} layout="mobile" reservations={reservationsQuery.data ?? []} onUpdateReservation={updateManagedReservation} />)}
        </section>

        {hasDetail && isDesktop && (
          <aside ref={editorCardRef} className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            {isEditing ? (
              <EventForm ref={eventFormRef} key={editingTarget?.id ?? 'new'} event={editingTarget ?? null} layout="panel" title={formTitle} onAutoSave={handleAutoSave} onCancel={() => setEditingTarget(undefined)} onSave={handleSave} />
            ) : managingEvent ? (
              reservationsQuery.isLoading ? <p role="status">Carregando reservas...</p> : reservationsQuery.error ? <p role="alert" className="text-marca">Não foi possível carregar as reservas.</p> : <EventManagement event={managingEvent} layout="panel" reservations={reservationsQuery.data ?? []} onUpdateReservation={updateManagedReservation} />
            ) : null}
          </aside>
        )}
      </div>

      {isEditing && !isDesktop && (
        <Dialog ariaLabel={formTitle} onClose={dismissEditor} className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-14">
          <EventForm ref={eventFormRef} key={editingTarget?.id ?? 'new'} event={editingTarget ?? null} layout="modal" title={formTitle} onAutoSave={handleAutoSave} onCancel={() => setEditingTarget(undefined)} onSave={handleSave} />
        </Dialog>
      )}

      {eventConfirmation && (
        <Dialog ariaLabel={eventConfirmation.action === 'publish' ? 'Publicar evento' : eventConfirmation.action === 'end' ? 'Encerrar evento' : eventConfirmation.action === 'archive' ? 'Arquivar evento' : 'Remover evento'} onClose={() => setEventConfirmation(null)} className="w-full max-w-[46rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised sm:p-12">
          <h2 className="text-4xl font-medium text-marca">{eventConfirmation.action === 'publish' ? 'Publicar Evento' : eventConfirmation.action === 'end' ? 'Encerrar Evento' : eventConfirmation.action === 'archive' ? 'Arquivar Evento' : eventConfirmation.event.status === 'draft' ? 'Remover Rascunho' : 'Remover Evento'}</h2>
          <h3 className="mt-6 text-3xl font-medium">{eventConfirmation.event.title}</h3>
          {eventConfirmation.action === 'end' && <p className="mt-3 text-lg">Novas reservas deixarão de ser aceitas. Os dados e a gestão das reservas serão mantidos.</p>}
          {eventConfirmation.action === 'publish' && <p className="mt-3 text-lg">Confirme que as informações foram verificadas. O evento ficará disponível ao público.</p>}
          {eventConfirmation.action === 'archive' && <p className="mt-3 text-lg">O evento sairá do histórico público, mas seus dados permanecerão disponíveis na gestão.</p>}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'draft' && <p className="mt-3 text-lg">O rascunho e todos os dados associados serão apagados.</p>}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'archived' && <p className="mt-3 text-lg">A exportação será enviada automaticamente ao e-mail configurado antes da exclusão. Se o envio falhar, nada será removido.</p>}
          {actionError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{actionError}</p>}
          <div className="mt-10 flex gap-4">
            <Action onClick={() => setEventConfirmation(null)} size="small" variant="secondary-adaptive" className="w-32 shrink-0">Cancelar</Action>
            <Action onClick={() => void confirmEventAction()} disabled={isConfirming} icon={eventConfirmation.action === 'archive' ? 'archive' : eventConfirmation.action === 'end' ? 'white-flag-solid' : eventConfirmation.action === 'publish' ? 'check-circle-solid' : 'trash-solid'} size="small" variant="primary-adaptive" className="min-w-0 flex-1">{isConfirming ? 'Processando...' : eventConfirmation.action === 'publish' ? 'Publicar Evento' : eventConfirmation.action === 'end' ? 'Encerrar Evento' : eventConfirmation.action === 'archive' ? 'Arquivar Evento' : 'Remover Evento'}</Action>
          </div>
        </Dialog>
      )}
    </main>
  )
}
