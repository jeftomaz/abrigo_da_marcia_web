-- Perfil privado dos administradores e autoria mínima dos agregados geridos.

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (
    display_name = btrim(display_name)
    and char_length(display_name) between 2 and 60
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

alter table public.admin_profiles enable row level security;

create policy "Admins read profiles"
  on public.admin_profiles
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Admins create own profile"
  on public.admin_profiles
  for insert
  to authenticated
  with check ((select public.is_admin()) and user_id = (select auth.uid()));

create policy "Admins update own profile"
  on public.admin_profiles
  for update
  to authenticated
  using ((select public.is_admin()) and user_id = (select auth.uid()))
  with check ((select public.is_admin()) and user_id = (select auth.uid()));

create policy "MFA protects admin profiles"
  on public.admin_profiles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

grant select, insert, update on public.admin_profiles to authenticated;

-- A verificação do link grava uma senha técnica antes de abrir o formulário. Essa
-- etapa não conclui o onboarding; o client sincroniza o nome antes do update da senha
-- escolhida, e somente esse update posterior cria o perfil.
create or replace function public.complete_invited_admin_onboarding()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if coalesce((old.raw_app_meta_data ->> 'admin_onboarding_completed')::boolean, false) then
    return new;
  end if;
  if profile_name = '' then
    return new;
  end if;
  if char_length(profile_name) not between 2 and 60 then
    raise exception 'Informe um nome ou apelido entre 2 e 60 caracteres.';
  end if;

  insert into public.admin_profiles (user_id, display_name)
  values (new.id, profile_name)
  on conflict (user_id) do update
    set display_name = excluded.display_name;

  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
    || '{"admin_onboarding_completed":true}'::jsonb;
  return new;
end;
$$;

revoke all on function public.complete_invited_admin_onboarding() from public;
grant execute on function public.complete_invited_admin_onboarding() to supabase_auth_admin;

do $$
declare
  aggregate_name text;
begin
  foreach aggregate_name in array array[
    'caes',
    'historias',
    'eventos',
    'reservas',
    'site_settings',
    'event_settings',
    'social_links'
  ] loop
    execute format(
      'alter table public.%I
         add column updated_by uuid references auth.users(id) on delete set null,
         add column updated_by_name text not null default ''Sistema''',
      aggregate_name
    );
  end loop;
end;
$$;

alter table public.event_deletion_audit
  add column deleted_by_name text not null default 'Sistema';

create function public.set_audit_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_id_setting text := nullif(current_setting('app.audit_actor_id', true), '');
  actor_name text := nullif(current_setting('app.audit_actor_name', true), '');
begin
  if actor_id_setting is not null then
    actor_id := actor_id_setting::uuid;
  elsif actor_name is null and auth.uid() is not null then
    select profile.user_id, profile.display_name
      into actor_id, actor_name
      from public.admin_profiles profile
      where profile.user_id = auth.uid();

    if actor_name is null then
      actor_id := null;
      actor_name := 'Visitante';
    end if;
  end if;

  if actor_name is null then
    actor_name := case
      when coalesce(auth.role(), '') = 'anon' then 'Visitante'
      else 'Sistema'
    end;
  end if;

  new.updated_by := actor_id;
  new.updated_by_name := actor_name;
  return new;
end;
$$;

revoke all on function public.set_audit_metadata() from public;

do $$
declare
  aggregate_name text;
begin
  foreach aggregate_name in array array[
    'caes',
    'historias',
    'eventos',
    'reservas',
    'site_settings',
    'event_settings',
    'social_links'
  ] loop
    execute format(
      'create trigger %I before insert or update on public.%I
       for each row execute function public.set_audit_metadata()',
      aggregate_name || '_set_audit_metadata',
      aggregate_name
    );
  end loop;
end;
$$;

create function public.set_audit_actor(p_actor_id uuid, p_fallback_name text default 'Sistema')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
begin
  select display_name into actor_name
  from public.admin_profiles
  where user_id = p_actor_id;

  perform set_config('app.audit_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.audit_actor_name', coalesce(actor_name, p_fallback_name), true);
end;
$$;

revoke all on function public.set_audit_actor(uuid, text) from public;

create or replace function public.expire_reservations_for_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_actor_id text := current_setting('app.audit_actor_id', true);
  previous_actor_name text := current_setting('app.audit_actor_name', true);
begin
  perform public.set_audit_actor(null, 'Sistema');
  update public.reservas
  set status = 'cancelada'
  where event_id = p_event_id and status = 'pendente' and expires_at <= now();
  perform set_config('app.audit_actor_id', coalesce(previous_actor_id, ''), true);
  perform set_config('app.audit_actor_name', coalesce(previous_actor_name, ''), true);
end;
$$;

revoke all on function public.expire_reservations_for_event(uuid) from public;

create or replace function public.draw_raffle_prize(p_prize_id uuid)
returns table (
  prize_id uuid,
  winning_number integer,
  winner_name text,
  drawn_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prize public.rifa_premios%rowtype;
  selected_number integer;
  selected_name text;
begin
  select * into prize from public.rifa_premios where id = p_prize_id for update;
  if prize.id is null then raise exception 'Prêmio não encontrado.'; end if;
  if not exists (
    select 1 from public.eventos where id = prize.event_id and status = 'ativo'
  ) then
    raise exception 'Somente uma rifa ativa pode ser sorteada.';
  end if;

  select rn.number, r.customer_name
  into selected_number, selected_name
  from public.reserva_numeros rn
  join public.reservas r on r.id = rn.reservation_id
  where rn.raffle_id = prize.event_id
    and rn.released_at is null
    and r.status in ('paga', 'entregue')
    and r.customer_name is not null
    and not exists (
      select 1 from public.rifa_premios other
      where other.event_id = prize.event_id
        and other.id <> prize.id
        and other.winning_number = rn.number
    )
  order by gen_random_uuid()
  limit 1;

  if selected_number is null then
    raise exception 'Não há números pagos disponíveis para este prêmio.';
  end if;

  update public.rifa_premios
  set winning_number = selected_number, winner_name = selected_name, drawn_at = now()
  where id = prize.id
  returning id, rifa_premios.winning_number, rifa_premios.winner_name, rifa_premios.drawn_at
  into prize_id, winning_number, winner_name, drawn_at;

  update public.eventos set updated_at = now() where id = prize.event_id;
  return next;
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

create or replace function public.activate_event(
  p_event_id uuid,
  p_exported_event_id uuid default null,
  p_export_sent_at timestamptz default null,
  p_export_email text default null,
  p_deleted_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.eventos%rowtype;
  oldest_event public.eventos%rowtype;
  published_count integer;
  export_email text;
  deleted_event_id uuid;
  actor_name text;
begin
  perform public.set_audit_actor(p_deleted_by, 'Sistema');
  actor_name := current_setting('app.audit_actor_name', true);
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
      event_id, event_name, deleted_by, deleted_by_name, export_email, export_sent_at
    ) values (
      oldest_event.id, oldest_event.name, p_deleted_by, actor_name, export_email, p_export_sent_at
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
