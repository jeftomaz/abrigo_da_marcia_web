create table public.site_settings (
  singleton boolean primary key default true check (singleton),
  donation_url text check (donation_url is null or donation_url ~* '^https://'),
  volunteer_form_url text check (volunteer_form_url is null or volunteer_form_url ~* '^https://'),
  adoption_form_url text not null check (adoption_form_url ~* '^https://'),
  updated_at timestamptz not null default now()
);

insert into public.site_settings (adoption_form_url)
select coalesce(
  (select adoption_form_url from public.caes where adoption_form_url ~* '^https://' order by updated_at desc limit 1),
  'https://forms.gle/nLSjXJyeLGUJXZj27'
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

alter table public.site_settings enable row level security;

drop view public.caes_public;
alter table public.caes drop column adoption_form_url;

create view public.caes_public as
  select id, name, description, birth_year, gender, size, photos, featured
  from public.caes
  where status = 'disponivel'
  order by featured desc, created_at desc;

create view public.site_settings_public as
  select donation_url, volunteer_form_url, adoption_form_url
  from public.site_settings
  where singleton;

alter table public.social_links
  add constraint social_links_https_url_check
  check (url is null or url ~* '^https://');

insert into public.social_links (network, url, display_order) values
  ('facebook', null, 1),
  ('instagram', null, 2)
on conflict (network) do nothing;

alter table public.event_settings
  add column default_pix_key text,
  add column default_pix_receiver text,
  add column default_pix_city text,
  add column default_pix_copy_paste text,
  add column default_post_payment_instructions text,
  add constraint event_settings_default_pix_key_check
    check (default_pix_key is null or btrim(default_pix_key) <> ''),
  add constraint event_settings_default_pix_receiver_check
    check (default_pix_receiver is null or btrim(default_pix_receiver) <> ''),
  add constraint event_settings_default_pix_city_check
    check (default_pix_city is null or btrim(default_pix_city) <> ''),
  add constraint event_settings_default_pix_copy_paste_check
    check (default_pix_copy_paste is null or btrim(default_pix_copy_paste) <> ''),
  add constraint event_settings_default_post_payment_instructions_check
    check (default_post_payment_instructions is null or btrim(default_post_payment_instructions) <> '');

create or replace function public.enforce_reachable_product_discount()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  effective_limit integer;
begin
  if tg_table_name = 'produtos' then
    if new.discount_min_quantity is null then return new; end if;
    select coalesce(e.max_items_per_reservation, s.default_max_product_units)
      into effective_limit
      from public.eventos e
      cross join public.event_settings s
      where e.id = new.event_id and s.singleton;
    if new.discount_min_quantity > effective_limit then
      raise exception 'A quantidade mínima para desconto deve ser igual ou menor que o máximo de % unidades por reserva.', effective_limit;
    end if;
  elsif tg_table_name = 'eventos' then
    if new.type = 'produtos' then
      select coalesce(new.max_items_per_reservation, s.default_max_product_units)
        into effective_limit
        from public.event_settings s
        where s.singleton;
      if exists (
        select 1 from public.produtos p
        where p.event_id = new.id and p.discount_min_quantity > effective_limit
      ) then
        raise exception 'O máximo por reserva não pode tornar um desconto cadastrado inalcançável.';
      end if;
    end if;
  elsif exists (
    select 1
    from public.eventos e
    join public.produtos p on p.event_id = e.id
    where e.type = 'produtos'
      and e.max_items_per_reservation is null
      and p.discount_min_quantity > new.default_max_product_units
  ) then
    raise exception 'O máximo padrão por reserva não pode tornar um desconto cadastrado inalcançável.';
  end if;
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

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
      'create policy %I on public.%I for all to authenticated
       using ((select public.is_admin()))
       with check ((select public.is_admin()))',
      'Admins manage ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
       using ((select auth.jwt() ->> ''aal'') = ''aal2'')
       with check ((select auth.jwt() ->> ''aal'') = ''aal2'')',
      'MFA protects ' || table_name,
      table_name
    );
  end loop;
end;
$$;

create policy "Admins read event deletion audit"
  on public.event_deletion_audit
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "MFA protects event deletion audit"
  on public.event_deletion_audit
  as restrictive
  for select
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Admins create event deletion audit"
  on public.event_deletion_audit
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "MFA protects event deletion audit inserts"
  on public.event_deletion_audit
  as restrictive
  for insert
  to authenticated
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Admins upload media"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'dog-photos' and (select public.is_admin()));

create policy "Admins read media objects"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'dog-photos' and (select public.is_admin()));

create policy "Admins delete media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'dog-photos' and (select public.is_admin()));

create policy "MFA protects media"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

grant select on public.caes_public, public.site_settings_public to anon, authenticated;
grant select, update on public.site_settings, public.social_links, public.event_settings to authenticated;
grant select, insert, update, delete on public.caes, public.historias, public.eventos,
  public.rifas, public.rifa_premios, public.produtos, public.produto_variacoes,
  public.produto_variacao_opcoes, public.reservas, public.reserva_produtos,
  public.reserva_produto_opcoes, public.reserva_numeros to authenticated;
grant select, insert on public.event_deletion_audit to authenticated;

alter function public.draw_raffle_prize(uuid) security invoker;
alter function public.delete_archived_event(uuid, timestamptz) security invoker;
grant execute on function public.draw_raffle_prize(uuid) to authenticated;
grant execute on function public.delete_archived_event(uuid, timestamptz) to authenticated;
