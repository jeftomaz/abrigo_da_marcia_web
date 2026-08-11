import {
  authorizeAdmin,
  createServiceClient,
  loadEventExport,
  removeEventPhotos,
  sendEventExport,
} from '../_shared/event-export.ts'
import { AdminFunctionError, handleAdminRequest } from '../_shared/admin-http.ts'

Deno.serve((request) => handleAdminRequest(request, 'delete-archived-event', async (request) => {
  const { supabase, userId } = await authorizeAdmin(request)
  const service = createServiceClient()
  const body = await request.json().catch(() => null) as { eventId?: unknown } | null
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  if (!eventId) throw new AdminFunctionError('VALIDATION_ERROR', 'Evento não informado.', 422)
  const eventExport = await loadEventExport(service, eventId)
  if (eventExport.event.status !== 'arquivado') {
    throw new AdminFunctionError('VALIDATION_ERROR', 'Somente eventos arquivados podem ser excluídos.', 422)
  }
  const exportEmail = eventExport.exportEmail
  if (!exportEmail) throw new AdminFunctionError('VALIDATION_ERROR', 'Configure o e-mail de exportação antes de continuar.', 422)
  const sentAt = await sendEventExport(eventExport)
  const { error: deleteError } = await service.rpc('delete_archived_event', {
    p_deleted_by: userId,
    p_event_id: eventId,
    p_export_email: exportEmail,
    p_export_sent_at: sentAt,
  })
  if (deleteError) {
    throw new AdminFunctionError('DATABASE_ERROR', 'O banco não conseguiu excluir o evento. O cadastro foi preservado.', 500, { cause: deleteError })
  }
  const cleanupWarning = await removeEventPhotos(supabase, eventExport.photoPaths)
  return { cleanupWarning, sentAt }
}))
