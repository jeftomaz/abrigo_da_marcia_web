import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Origin': '*' }
const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
function toBase64(value: string) {
  const bytes = new TextEncoder().encode(`\ufeff${value}`)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization) throw new Error('Sessão administrativa ausente.')
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(authorization.replace('Bearer ', ''))
    if (claimsError || claims?.claims?.aal !== 'aal2' || claims.claims.app_metadata?.role !== 'admin') throw new Error('Sessão administrativa com MFA obrigatória.')
    const { eventId } = await request.json() as { eventId?: string }
    if (!eventId) throw new Error('Evento não informado.')
    const [{ data: event, error: eventError }, { data: settings, error: settingsError }, { data: reservations, error: reservationsError }] = await Promise.all([
      supabase.from('eventos').select('id,name,status').eq('id', eventId).single(),
      supabase.from('event_settings').select('event_export_email').single(),
      supabase.from('reservas').select('id,customer_name,customer_contact,status,total_cents,receipt_saved,expires_at,created_at').eq('event_id', eventId).order('created_at'),
    ])
    if (eventError || settingsError || reservationsError) throw eventError ?? settingsError ?? reservationsError
    if (event.status !== 'arquivado') throw new Error('Somente eventos arquivados podem ser excluídos.')
    if (!settings.event_export_email) throw new Error('Configure o e-mail de exportação antes de remover o evento.')
    const rows = [['ID', 'Nome', 'Contato', 'Status', 'Total', 'Comprovante salvo', 'Expira em', 'Criada em'], ...(reservations ?? []).map((row) => [row.id, row.customer_name, row.customer_contact, row.status, (row.total_cents / 100).toFixed(2), row.receipt_saved ? 'Sim' : 'Não', row.expires_at, row.created_at])]
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: Deno.env.get('RESEND_FROM_EMAIL'), to: [settings.event_export_email], subject: `Exportação de reservas — ${event.name}`, html: `<p>A exportação das reservas de <strong>${event.name}</strong> segue anexada antes da exclusão definitiva.</p>`, attachments: [{ content: toBase64(csv), filename: `${event.name.toLocaleLowerCase('pt-BR').replaceAll(' ', '-')}-reservas.csv` }] }),
    })
    if (!response.ok) throw new Error(`O Resend recusou o envio (${response.status}).`)
    const sentAt = new Date().toISOString()
    const { error: deleteError } = await supabase.rpc('delete_archived_event', { p_event_id: eventId, p_export_sent_at: sentAt })
    if (deleteError) throw deleteError
    return Response.json({ sentAt }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'A operação falhou.' }, { status: 400, headers: corsHeaders })
  }
})
