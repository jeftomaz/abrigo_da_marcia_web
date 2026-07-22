import { useMemo, useState } from 'react'
import {
  Action,
  Dialog,
  useAdminEvents,
  useDeleteEvent,
  useEventReservations,
  useSaveEvent,
  useUpdateEventReservation,
  useUpdateEventStatus,
} from '@abrigo/shared'
import { useNavigate } from 'react-router-dom'
import { EventForm } from '../components/EventForm'
import { EventManagement } from '../components/EventManagement'
import { EventRow } from '../components/EventRow'
import { EventSettingsForm } from '../components/EventSettingsForm'
import type { EventDraft, EventStatus, FundraisingEvent, ReservationStatus } from '../events/events'
import { useIsDesktop } from '../hooks/useIsDesktop'

type EventConfirmation = { action: 'archive' | 'end' | 'remove'; event: FundraisingEvent }

export function Eventos() {
  const { data: events = [], error: loadError, isLoading } = useAdminEvents()
  const saveEvent = useSaveEvent()
  const updateStatus = useUpdateEventStatus()
  const deleteEvent = useDeleteEvent()
  const [editingTarget, setEditingTarget] = useState<FundraisingEvent | null | undefined>(undefined)
  const [managingEventId, setManagingEventId] = useState<string | null>(null)
  const [eventConfirmation, setEventConfirmation] = useState<EventConfirmation | null>(null)
  const [actionError, setActionError] = useState('')
  const [exportConfirmed, setExportConfirmed] = useState(false)
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const isEditing = editingTarget !== undefined
  const managingEvent = events.find((event) => event.id === managingEventId) ?? null
  const reservationsQuery = useEventReservations(managingEventId ?? '')
  const updateReservation = useUpdateEventReservation(managingEventId ?? '')
  const hasDetail = isEditing || Boolean(managingEvent)
  const activeEvent = useMemo(() => events.find((event) => event.status === 'active'), [events])
  const displayedEvents = !isDesktop && managingEvent ? [managingEvent] : events

  const handleSave = async (draft: EventDraft) => {
    await saveEvent.mutateAsync(draft)
    setEditingTarget(undefined)
  }

  const handleSetStatus = async (event: FundraisingEvent, status: EventStatus) => {
    setActionError('')
    try {
      await updateStatus.mutateAsync({ id: event.id, status })
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Não foi possível alterar o status.')
    }
  }

  const confirmEventAction = async () => {
    if (!eventConfirmation) return
    const { action, event } = eventConfirmation
    setActionError('')
    try {
      if (action === 'end') await handleSetStatus(event, 'ended')
      if (action === 'archive') await handleSetStatus(event, 'archived')
      if (action === 'remove') await deleteEvent.mutateAsync({
        event,
        exportSentAt: event.status === 'archived' ? new Date().toISOString() : undefined,
      })
      if (managingEventId === event.id) setManagingEventId(null)
      if (editingTarget?.id === event.id) setEditingTarget(undefined)
      setEventConfirmation(null)
      setExportConfirmed(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'A ação não foi concluída.')
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

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${hasDetail ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(36rem,45rem)] desk:justify-between' : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'}`}>
        <section aria-label="Resumo de eventos" className="space-y-3">
          <div className="grid grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)] gap-3">
            <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised"><strong className="block text-4xl font-medium">{events.length}</strong><span className="font-medium">Total de eventos</span></div>
            <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised"><strong className="block truncate text-2xl font-medium text-marca">{activeEvent?.title ?? 'Nenhum evento'}</strong><span className="font-medium">{activeEvent ? 'Evento ativo' : 'Sem evento ativo'}</span></div>
          </div>
          <EventSettingsForm />
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
                onRemove={() => { setExportConfirmed(false); setEventConfirmation({ action: 'remove', event }) }}
                onSetStatus={(status) => void handleSetStatus(event, status)}
              />
            ))}
            {!isLoading && events.length === 0 && <p className="py-6 text-center">Nenhum evento cadastrado.</p>}
          </div>
          {managingEvent && !isDesktop && <EventManagement event={managingEvent} layout="mobile" reservations={reservationsQuery.data ?? []} onUpdateReservation={updateManagedReservation} />}
        </section>

        {hasDetail && isDesktop && (
          <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            {isEditing ? (
              <EventForm key={editingTarget?.id ?? 'new'} event={editingTarget ?? null} layout="panel" title={formTitle} onCancel={() => setEditingTarget(undefined)} onSave={handleSave} />
            ) : managingEvent ? (
              <EventManagement event={managingEvent} layout="panel" reservations={reservationsQuery.data ?? []} onUpdateReservation={updateManagedReservation} />
            ) : null}
          </aside>
        )}
      </div>

      {isEditing && !isDesktop && (
        <Dialog ariaLabel={formTitle} onClose={() => setEditingTarget(undefined)} className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-14">
          <EventForm key={editingTarget?.id ?? 'new'} event={editingTarget ?? null} layout="modal" title={formTitle} onCancel={() => setEditingTarget(undefined)} onSave={handleSave} />
        </Dialog>
      )}

      {eventConfirmation && (
        <Dialog ariaLabel={eventConfirmation.action === 'end' ? 'Encerrar evento' : eventConfirmation.action === 'archive' ? 'Arquivar evento' : 'Remover evento'} onClose={() => setEventConfirmation(null)} className="w-full max-w-[46rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised sm:p-12">
          <h2 className="text-4xl font-medium text-marca">{eventConfirmation.action === 'end' ? 'Encerrar Evento' : eventConfirmation.action === 'archive' ? 'Arquivar Evento' : eventConfirmation.event.status === 'draft' ? 'Remover Rascunho' : 'Remover Evento'}</h2>
          <h3 className="mt-6 text-3xl font-medium">{eventConfirmation.event.title}</h3>
          {eventConfirmation.action === 'end' && <p className="mt-3 text-lg">Novas reservas deixarão de ser aceitas. Os dados e a gestão das reservas serão mantidos.</p>}
          {eventConfirmation.action === 'archive' && <p className="mt-3 text-lg">O evento sairá do histórico público, mas seus dados permanecerão disponíveis na gestão.</p>}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'draft' && <p className="mt-3 text-lg">O rascunho e todos os dados associados serão apagados.</p>}
          {eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'archived' && (
            <label className="mt-5 flex items-start gap-3 rounded-2xl bg-cinza-claro p-4 text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
              <input type="checkbox" checked={exportConfirmed} onChange={(event) => setExportConfirmed(event.target.checked)} className="mt-1 accent-marca" />
              <span>Confirmo que exportei as reservas e enviei a cópia ao e-mail definido nas Configurações. A confirmação ficará registrada na auditoria.</span>
            </label>
          )}
          {actionError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{actionError}</p>}
          <div className="mt-10 flex gap-4">
            <Action onClick={() => setEventConfirmation(null)} size="small" variant="secondary-adaptive" className="w-32 shrink-0">Cancelar</Action>
            <Action onClick={() => void confirmEventAction()} disabled={isConfirming || (eventConfirmation.action === 'remove' && eventConfirmation.event.status === 'archived' && !exportConfirmed)} icon={eventConfirmation.action === 'archive' ? 'archive' : eventConfirmation.action === 'end' ? 'white-flag-solid' : 'trash-solid'} size="small" variant="primary-adaptive" className="min-w-0 flex-1">{isConfirming ? 'Processando...' : eventConfirmation.action === 'end' ? 'Encerrar Evento' : eventConfirmation.action === 'archive' ? 'Arquivar Evento' : 'Remover Evento'}</Action>
          </div>
        </Dialog>
      )}
    </main>
  )
}
