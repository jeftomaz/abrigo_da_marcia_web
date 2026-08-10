-- Generaliza a exclusão auditada legada para permitir a remoção manual de
-- eventos encerrados após a exportação por e-mail.

create or replace function public.delete_archived_event(
  p_event_id uuid,
  p_export_sent_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selected_event public.eventos%rowtype;
  export_email text;
  actor_id uuid := auth.uid();
  actor_name text;
begin
  select display_name into actor_name
  from public.admin_profiles
  where user_id = actor_id;
  actor_name := coalesce(actor_name, 'Sistema');

  select * into selected_event from public.eventos where id = p_event_id for update;
  if selected_event.id is null or selected_event.status not in ('encerrado', 'arquivado') then
    raise exception 'Somente eventos encerrados ou arquivados podem usar a exclusão auditada.';
  end if;
  select event_export_email into export_email from public.event_settings where singleton;
  if export_email is null then
    raise exception 'Configure o e-mail de exportação antes de remover o evento.';
  end if;
  if p_export_sent_at is null or p_export_sent_at > now() then
    raise exception 'Confirme o envio da cópia antes de remover o evento.';
  end if;

  insert into public.event_deletion_audit (
    event_id, event_name, deleted_by, deleted_by_name, export_email, export_sent_at
  ) values (
    selected_event.id, selected_event.name, actor_id, actor_name, export_email, p_export_sent_at
  );
  perform set_config('app.confirmed_event_delete', 'on', true);
  delete from public.eventos where id = selected_event.id;
end;
$$;
