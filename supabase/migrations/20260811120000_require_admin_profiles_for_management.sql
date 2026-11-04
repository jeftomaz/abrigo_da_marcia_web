-- Perfil concluído passa a ser requisito de toda operação administrativa disponível em produção.

create function public.is_profiled_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
    and exists (
      select 1
      from public.admin_profiles profile
      where profile.user_id = auth.uid()
    );
$$;

revoke all on function public.is_profiled_admin() from public, anon;
grant execute on function public.is_profiled_admin() to authenticated;

alter policy "Admins read profiles"
  on public.admin_profiles
  using (
    user_id = (select auth.uid())
    or (select public.is_profiled_admin())
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'site_settings',
    'social_links',
    'caes',
    'historias',
    'event_settings',
    'eventos',
    'rifas',
    'rifa_premios',
    'produtos',
    'produto_variacoes',
    'produto_variacao_opcoes',
    'reservas',
    'reserva_produtos',
    'reserva_produto_opcoes',
    'reserva_numeros'
  ] loop
    execute format(
      'alter policy %I on public.%I
       using ((select public.is_profiled_admin()))
       with check ((select public.is_profiled_admin()))',
      'Admins manage ' || table_name,
      table_name
    );
  end loop;
end;
$$;

alter policy "Admins read event deletion audit"
  on public.event_deletion_audit
  using ((select public.is_profiled_admin()));

alter policy "Admins create event deletion audit"
  on public.event_deletion_audit
  with check ((select public.is_profiled_admin()));

alter policy "Admins upload media"
  on storage.objects
  with check (bucket_id = 'dog-photos' and (select public.is_profiled_admin()));

alter policy "Admins read media objects"
  on storage.objects
  using (bucket_id = 'dog-photos' and (select public.is_profiled_admin()));

alter policy "Admins delete media"
  on storage.objects
  using (bucket_id = 'dog-photos' and (select public.is_profiled_admin()));

create or replace function public.set_audit_metadata()
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
      raise exception using
        errcode = '42501',
        message = 'Perfil administrativo obrigatório para registrar alterações.';
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

create or replace function public.set_audit_actor(p_actor_id uuid, p_fallback_name text default 'Sistema')
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

  if p_actor_id is not null and actor_name is null then
    raise exception using
      errcode = '42501',
      message = 'Perfil administrativo obrigatório para registrar alterações.';
  end if;

  perform set_config('app.audit_actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.audit_actor_name', coalesce(actor_name, p_fallback_name), true);
end;
$$;
