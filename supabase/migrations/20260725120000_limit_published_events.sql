-- Mantém no máximo quatro eventos já ativados. A quinta ativação passa pela
-- Edge Function, que exporta o mais antigo antes da exclusão transacional.

do $$
begin
  if (
    select count(*)
    from public.eventos
    where status <> 'rascunho'
  ) > 4 then
    raise exception 'Existem mais de quatro eventos publicados; reduza o histórico antes de aplicar esta migration.';
  end if;
end;
$$;

create function public.enforce_event_publication_limit()
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
  if new.status = 'arquivado' and old.status <> 'arquivado' then
    raise exception 'Eventos encerrados permanecem no histórico até a exclusão automática.';
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

create trigger eventos_enforce_publication_limit
before insert or update of status on public.eventos
for each row execute function public.enforce_event_publication_limit();

create function public.activate_event(
  p_event_id uuid,
  p_exported_event_id uuid default null,
  p_export_sent_at timestamptz default null,
  p_export_email text default null,
  p_deleted_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_event public.eventos%rowtype;
  oldest_event public.eventos%rowtype;
  published_count integer;
  export_email text;
  deleted_event_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('public.activate_event', 0));

  select * into target_event
  from public.eventos
  where id = p_event_id
  for update;

  if target_event.id is null then
    raise exception 'Evento não encontrado.';
  end if;
  if target_event.status not in ('rascunho', 'encerrado') then
    raise exception 'Somente eventos em rascunho ou encerrados podem ser ativados.';
  end if;
  if exists (
    select 1
    from public.eventos
    where status = 'ativo'
      and id <> target_event.id
  ) then
    raise exception 'Encerre o evento ativo antes de publicar outro.';
  end if;

  select count(*) into published_count
  from public.eventos
  where status <> 'rascunho'
    and id <> target_event.id;

  if published_count >= 4 then
    select * into oldest_event
    from public.eventos
    where status <> 'rascunho'
      and id <> target_event.id
    order by coalesce(activated_at, created_at), created_at, id
    limit 1
    for update;

    if oldest_event.status = 'ativo' then
      raise exception 'Encerre o evento ativo antes de publicar outro.';
    end if;
    if p_exported_event_id is distinct from oldest_event.id then
      raise exception 'A cópia do evento mais antigo precisa ser enviada antes da publicação.';
    end if;
    if p_export_sent_at is null
      or p_export_sent_at > now() + interval '1 minute'
      or p_export_sent_at < now() - interval '10 minutes' then
      raise exception 'O envio da cópia do evento mais antigo não foi confirmado recentemente.';
    end if;

    select event_export_email into export_email
    from public.event_settings
    where singleton;
    if export_email is null then
      raise exception 'Configure o e-mail de exportação antes de publicar o quinto evento.';
    end if;
    if p_export_email is distinct from export_email then
      raise exception 'O destinatário da cópia mudou durante a publicação; envie novamente.';
    end if;

    insert into public.event_deletion_audit (
      event_id, event_name, deleted_by, export_email, export_sent_at
    ) values (
      oldest_event.id, oldest_event.name, p_deleted_by, export_email, p_export_sent_at
    );

    perform set_config('app.confirmed_event_delete', 'on', true);
    delete from public.eventos where id = oldest_event.id;
    deleted_event_id := oldest_event.id;
  elsif p_exported_event_id is not null or p_export_sent_at is not null or p_export_email is not null then
    raise exception 'Nenhum evento precisa ser excluído nesta publicação.';
  end if;

  perform set_config('app.confirmed_event_activation', 'on', true);
  update public.eventos
  set status = 'ativo'
  where id = target_event.id;

  return deleted_event_id;
end;
$$;

revoke all on function public.activate_event(uuid, uuid, timestamptz, text, uuid) from public;
grant execute on function public.activate_event(uuid, uuid, timestamptz, text, uuid) to service_role;

drop view public.eventos_public;
create view public.eventos_public as
  select id, name, description, type, status, photos, start_date, end_date,
    fundraising_goal_cents, max_items_per_reservation,
    extract(epoch from reservation_ttl)::integer as reservation_ttl_seconds,
    pix_key, pix_receiver, pix_city, post_payment_instructions, created_at
  from public.eventos
  where status in ('ativo', 'encerrado')
    and (status = 'encerrado' or current_date between start_date and end_date)
  order by case status when 'ativo' then 0 else 1 end,
    coalesce(activated_at, created_at) desc,
    created_at desc
  limit 4;

grant select on public.eventos_public to anon, authenticated;
