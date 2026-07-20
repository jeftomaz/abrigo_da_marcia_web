import { useEffect, useMemo, useRef, useState } from 'react'
import { Action, Dialog } from '@abrigo/shared'
import { EventForm } from '../components/EventForm'
import { EventRow } from '../components/EventRow'
import type { EventDraft, EventStatus, FundraisingEvent } from '../events/events'
import { TEMPORARY_EVENTS } from '../events/events'
import { useIsDesktop } from '../hooks/useIsDesktop'

export function Eventos() {
  const [events, setEvents] = useState(TEMPORARY_EVENTS)
  const [editingTarget, setEditingTarget] = useState<FundraisingEvent | null | undefined>(undefined)
  const createdEventUrls = useRef(new Set<string>())
  const isDesktop = useIsDesktop()
  const isEditing = editingTarget !== undefined
  const activeEvent = useMemo(() => events.find((event) => event.status === 'active'), [events])

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
    const savedEvent: FundraisingEvent = {
      ...draft,
      id: draft.id ?? crypto.randomUUID(),
      status: draft.status ?? 'draft',
      gallery,
    }
    setEvents((current) =>
      draft.id
        ? current.map((event) => (event.id === draft.id ? savedEvent : event))
        : [savedEvent, ...current],
    )
    setEditingTarget(undefined)
  }

  const handleRemove = (event: FundraisingEvent) => {
    if (!window.confirm(`${event.status === 'ended' ? 'Arquivar' : 'Remover'} ${event.title}?`)) return
    event.gallery.forEach((url) => {
      if (createdEventUrls.current.delete(url)) URL.revokeObjectURL(url)
    })
    setEvents((current) => current.filter((item) => item.id !== event.id))
    if (editingTarget?.id === event.id) setEditingTarget(undefined)
  }

  const handleSetStatus = (event: FundraisingEvent, status: EventStatus) => {
    if (status === 'active' && activeEvent && activeEvent.id !== event.id) {
      window.alert('Encerre o evento ativo antes de publicar ou reativar outro evento.')
      return
    }
    setEvents((current) =>
      current.map((item) => (item.id === event.id ? { ...item, status } : item)),
    )
  }

  const formTitle = editingTarget ? 'Editar Evento' : 'Novo Evento'

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div
        className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${
          isEditing
            ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(36rem,45rem)] desk:justify-between'
            : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'
        }`}
      >
        <section
          aria-label="Resumo de eventos"
          className="grid grid-cols-[minmax(7rem,1fr)_minmax(0,2fr)] gap-3"
        >
          <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised">
            <strong className="block text-4xl font-medium">
              {events.filter((event) => event.status === 'active').length}
            </strong>
            <span className="font-medium">Total de eventos</span>
          </div>
          <div className="rounded-2xl bg-surface-raised px-5 py-4 text-on-surface-raised">
            <strong className="block truncate text-2xl font-medium text-marca">
              {activeEvent?.title ?? 'Nenhum evento'}
            </strong>
            <span className="font-medium">{activeEvent ? 'Evento ativo' : 'Sem evento ativo'}</span>
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-4xl font-medium">Eventos</h1>
            <Action
              onClick={() => setEditingTarget(null)}
              icon="keyframe-plus-in-solid"
              size="small"
              variant="primary-adaptive"
              className="shrink-0 px-5"
            >
              Novo Evento
            </Action>
          </div>

          <div className="flex min-w-0 flex-col gap-5 sm:gap-6 desk:gap-3">
            {events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                isEditing={editingTarget?.id === event.id}
                onDraw={() => window.alert('O sorteio será habilitado com a persistência das reservas.')}
                onEdit={() => setEditingTarget(event)}
                onOpenReservations={() =>
                  window.alert('A gestão de reservas será habilitada na próxima etapa de Eventos.')
                }
                onRemove={() => handleRemove(event)}
                onSetStatus={(status) => handleSetStatus(event, status)}
              />
            ))}
            {events.length === 0 && <p className="py-6 text-center">Nenhum evento cadastrado.</p>}
          </div>
        </section>

        {isEditing && isDesktop && (
          <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            <EventForm
              key={editingTarget?.id ?? 'new'}
              event={editingTarget ?? null}
              layout="panel"
              title={formTitle}
              onCancel={() => setEditingTarget(undefined)}
              onSave={handleSave}
            />
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
    </main>
  )
}
