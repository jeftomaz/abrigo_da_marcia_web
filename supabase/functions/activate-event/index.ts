import {
  authorizeAdmin,
  corsHeadersFor,
  createServiceClient,
  errorMessage,
  loadEventExport,
  removeEventPhotos,
  sendEventExport,
} from '../_shared/event-export.ts'

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

Deno.serve(async (request) => {
  const cors = corsHeadersFor(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { supabase, userId } = await authorizeAdmin(request)
    const service = createServiceClient()
    const { eventId } = await request.json() as { eventId?: string }
    if (!eventId) throw new Error('Evento não informado.')

    const [{ data: target, error: targetError }, { data: published, error: publishedError }] = await Promise.all([
      supabase.from('eventos').select('id,status').eq('id', eventId).single(),
      supabase.from('eventos').select('id,status,activated_at,created_at').neq('status', 'rascunho'),
    ])
    if (targetError || publishedError) throw targetError ?? publishedError
    if (!target || !['rascunho', 'encerrado'].includes(target.status)) {
      throw new Error('Somente eventos em rascunho ou encerrados podem ser ativados.')
    }

    const previousEvents = ((published ?? []) as PublishedEvent[])
      .filter((event) => event.id !== eventId)
      .sort(oldestFirst)
    if (previousEvents.some((event) => event.status === 'ativo')) {
      throw new Error('Encerre o evento ativo antes de publicar outro.')
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
    if (activationError) throw activationError

    const cleanupWarning = deletedEventId
      ? await removeEventPhotos(supabase, photoPaths)
      : null
    return Response.json({ cleanupWarning, deletedEventId, exportSentAt }, { headers: cors })
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 400, headers: cors })
  }
})
