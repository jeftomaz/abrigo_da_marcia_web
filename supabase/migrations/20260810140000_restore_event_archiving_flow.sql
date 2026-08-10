-- Restaura a etapa explícita de arquivamento antes da exclusão auditada.

create or replace function public.enforce_event_publication_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  published_count integer;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'rascunho' then
      raise exception 'Todo evento deve ser criado como rascunho.';
    end if;
    return new;
  end if;

  if new.status = 'ativo' and old.status <> 'ativo'
    and current_setting('app.confirmed_event_activation', true) is distinct from 'on' then
    raise exception 'Publique o evento pelo fluxo de ativação com exportação automática.';
  end if;

  if new.status <> 'rascunho' and old.status = 'rascunho' then
    select count(*) into published_count
    from public.eventos
    where status <> 'rascunho'
      and id <> new.id;

    if published_count >= 4 then
      raise exception 'O histórico público está limitado a quatro eventos.';
    end if;
  end if;

  return new;
end;
$$;

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
  if selected_event.id is null or selected_event.status <> 'arquivado' then
    raise exception 'Somente eventos arquivados podem usar a exclusão auditada.';
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
