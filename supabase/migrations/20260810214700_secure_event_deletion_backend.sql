-- Garante que somente o backend autenticado possa confirmar o envio e excluir eventos.

revoke all on function public.delete_archived_event(uuid, timestamptz)
  from public, anon, authenticated;
drop function public.delete_archived_event(uuid, timestamptz);

create function public.delete_archived_event(
  p_event_id uuid,
  p_export_sent_at timestamptz,
  p_export_email text,
  p_deleted_by uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.eventos%rowtype;
  configured_email text;
  actor_name text;
begin
  select display_name into actor_name
  from public.admin_profiles
  where user_id = p_deleted_by;
  actor_name := coalesce(actor_name, 'Sistema');

  select * into selected_event
  from public.eventos
  where id = p_event_id
  for update;
  if selected_event.id is null or selected_event.status <> 'arquivado' then
    raise exception 'Somente eventos arquivados podem usar a exclusão auditada.';
  end if;

  select event_export_email into configured_email
  from public.event_settings
  where singleton;
  if configured_email is null then
    raise exception 'Configure o e-mail de exportação antes de remover o evento.';
  end if;
  if p_export_email is distinct from configured_email then
    raise exception 'O destinatário da cópia mudou durante a exclusão; envie novamente.';
  end if;
  if p_export_sent_at is null
    or p_export_sent_at > now() + interval '1 minute'
    or p_export_sent_at < now() - interval '10 minutes' then
    raise exception 'O envio da cópia não foi confirmado recentemente.';
  end if;

  insert into public.event_deletion_audit (
    event_id, event_name, deleted_by, deleted_by_name, export_email, export_sent_at
  ) values (
    selected_event.id, selected_event.name, p_deleted_by, actor_name,
    configured_email, p_export_sent_at
  );
  perform set_config('app.confirmed_event_delete', 'on', true);
  delete from public.eventos where id = selected_event.id;
end;
$$;

revoke all on function public.delete_archived_event(uuid, timestamptz, text, uuid)
  from public, anon, authenticated;
grant execute on function public.delete_archived_event(uuid, timestamptz, text, uuid)
  to service_role;
