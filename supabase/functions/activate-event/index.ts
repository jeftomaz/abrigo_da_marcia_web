import {
  authorizeAdmin,
  createServiceClient,
  loadEventExport,
  removeEventPhotos,
  sendEventExport,
} from '../_shared/event-export.ts'
import { AdminFunctionError, handleAdminRequest } from '../_shared/admin-http.ts'

type PublishedEvent = {
  activated_at: string | null
  created_at: string
  id: string
  status: 'ativo' | 'arquivado' | 'encerrado'
}

function oldestFirst(left: PublishedEvent, right: PublishedEvent) {
  const activation = (left.activated_at ?? left.created_at).localeCompare(right.activated_at ?? right.created_at)
  return activation || left.created_at.localeCompare(right.created_at) || left.id.localeCompare(right.id)
}

Deno.serve((request) => handleAdminRequest(request, 'activate-event', async (request) => {
  const { supabase, userId } = await authorizeAdmin(request)
  const service = createServiceClient()
  const body = await request.json().catch(() => null) as { eventId?: unknown } | null
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  if (!eventId) throw new AdminFunctionError('VALIDATION_ERROR', 'Evento não informado.', 422)

  const [{ data: target, error: targetError }, { data: published, error: publishedError }] = await Promise.all([
    supabase.from('eventos').select('id,status').eq('id', eventId).single(),
    supabase.from('eventos').select('id,status,activated_at,created_at').neq('status', 'rascunho'),
  ])
  if (targetError?.code === 'PGRST116') {
    throw new AdminFunctionError('NOT_FOUND', 'Evento não encontrado.', 404, { cause: targetError })
  }
  if (targetError || publishedError) {
    throw new AdminFunctionError('DATABASE_ERROR', 'Não foi possível verificar os eventos publicados.', 500, {
      cause: targetError ?? publishedError,
    })
  }
  if (!target || !['rascunho', 'encerrado'].includes(target.status)) {
    throw new AdminFunctionError('VALIDATION_ERROR', 'Somente eventos em rascunho ou encerrados podem ser ativados.', 422)
  }

  const previousEvents = ((published ?? []) as PublishedEvent[])
    .filter((event) => event.id !== eventId)
    .sort(oldestFirst)
  if (previousEvents.some((event) => event.status === 'ativo')) {
    throw new AdminFunctionError('CONFLICT', 'Encerre o evento ativo antes de publicar outro.', 409)
  }

  let exportedEventId: string | null = null
  let exportSentAt: string | null = null
  let exportEmail: string | null = null
  let photoPaths: string[] = []
  if (previousEvents.length >= 4) {
    const oldest = previousEvents[0]
    const eventExport = await loadEventExport(service, oldest.id)
    exportSentAt = await sendEventExport(eventExport)
    exportedEventId = oldest.id
    exportEmail = eventExport.exportEmail
    photoPaths = eventExport.photoPaths
  }

  const { data: deletedEventId, error: activationError } = await service.rpc('activate_event', {
    p_deleted_by: userId,
    p_event_id: eventId,
    p_export_email: exportEmail,
    p_exported_event_id: exportedEventId,
    p_export_sent_at: exportSentAt,
  })
  if (activationError) {
    throw new AdminFunctionError('DATABASE_ERROR', 'O banco não conseguiu ativar o evento. O cadastro foi preservado.', 500, { cause: activationError })
  }

  const cleanupWarning = deletedEventId
    ? await removeEventPhotos(supabase, photoPaths)
    : null
  return { cleanupWarning, deletedEventId, exportSentAt }
}))
