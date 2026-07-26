import {
  authorizeAdmin,
  corsHeaders,
  createServiceClient,
  errorMessage,
  loadEventExport,
  removeEventPhotos,
  sendEventExport,
} from '../_shared/event-export.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { supabase } = await authorizeAdmin(request)
    const service = createServiceClient()
    const { eventId } = await request.json() as { eventId?: string }
    if (!eventId) throw new Error('Evento não informado.')
    const eventExport = await loadEventExport(service, eventId)
    if (eventExport.event.status !== 'arquivado') throw new Error('Somente eventos arquivados podem ser excluídos.')
    const sentAt = await sendEventExport(eventExport)
    const { error: deleteError } = await supabase.rpc('delete_archived_event', { p_event_id: eventId, p_export_sent_at: sentAt })
    if (deleteError) throw deleteError
    const cleanupWarning = await removeEventPhotos(supabase, eventExport.photoPaths)
    return Response.json({ cleanupWarning, sentAt }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400, headers: corsHeaders })
  }
})
