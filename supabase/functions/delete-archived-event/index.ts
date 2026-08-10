import {
  authorizeAdmin,
  createServiceClient,
  loadEventExport,
  removeEventPhotos,
  sendEventExport,
} from '../_shared/event-export.ts'
import { AdminFunctionError, handleAdminRequest } from '../_shared/admin-http.ts'

Deno.serve((request) => handleAdminRequest(request, 'delete-archived-event', async (request) => {
  const { supabase } = await authorizeAdmin(request)
  const service = createServiceClient()
  const body = await request.json().catch(() => null) as { eventId?: unknown } | null
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  if (!eventId) throw new AdminFunctionError('VALIDATION_ERROR', 'Evento não informado.', 422)
  const eventExport = await loadEventExport(service, eventId)
  if (!['encerrado', 'arquivado'].includes(eventExport.event.status)) {
    throw new AdminFunctionError('VALIDATION_ERROR', 'Somente eventos encerrados ou arquivados podem ser excluídos.', 422)
  }
  const sentAt = await sendEventExport(eventExport)
  const { error: deleteError } = await supabase.rpc('delete_archived_event', { p_event_id: eventId, p_export_sent_at: sentAt })
  if (deleteError) {
    throw new AdminFunctionError('DATABASE_ERROR', 'O banco não conseguiu excluir o evento. O cadastro foi preservado.', 500, { cause: deleteError })
  }
  const cleanupWarning = await removeEventPhotos(supabase, eventExport.photoPaths)
  return { cleanupWarning, sentAt }
}))
