-- Eventos, catálogo e reservas. O acesso público acontece somente pelas views e RPCs.

create extension if not exists pg_cron with schema pg_catalog;

create type public.evento_tipo as enum ('rifa', 'produtos');
create type public.evento_status as enum ('rascunho', 'ativo', 'encerrado', 'arquivado');
create type public.reserva_status as enum ('pendente', 'paga', 'cancelada', 'entregue');

create table public.event_settings (
  singleton boolean primary key default true check (singleton),
  default_max_raffle_numbers integer not null default 10 check (default_max_raffle_numbers > 0),
  default_max_product_units integer not null default 10 check (default_max_product_units > 0),
  default_reservation_ttl interval not null default interval '30 minutes' check (default_reservation_ttl > interval '0'),
  event_export_email text check (event_export_email is null or event_export_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  updated_at timestamptz not null default now()
);

insert into public.event_settings default values;

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null check (char_length(btrim(description)) between 1 and 2000),
  type public.evento_tipo not null,
  status public.evento_status not null default 'rascunho',
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  start_date date not null,
  end_date date not null,
  fundraising_goal_cents bigint not null check (fundraising_goal_cents > 0),
  max_items_per_reservation integer check (max_items_per_reservation > 0),
  reservation_ttl interval check (reservation_ttl > interval '0'),
  pix_key text,
  pix_receiver text,
  pix_city text,
  pix_copy_paste text,
  post_payment_instructions text not null,
  receipt_folder_url text check (receipt_folder_url is null or receipt_folder_url ~* '^https://'),
  data_verified_at timestamptz,
  activated_at timestamptz,
  ended_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_date <= end_date),
  check (pix_key is null or btrim(pix_key) <> ''),
  check (pix_receiver is null or btrim(pix_receiver) <> ''),
  check (pix_city is null or btrim(pix_city) <> ''),
  check (pix_copy_paste is null or btrim(pix_copy_paste) <> ''),
  check (btrim(post_payment_instructions) <> '')
);

create unique index eventos_one_active_idx on public.eventos ((status)) where status = 'ativo';

create table public.rifas (
  event_id uuid primary key references public.eventos(id) on delete cascade,
  total_numbers integer not null check (total_numbers between 1 and 1000),
  number_price_cents integer not null check (number_price_cents > 0)
);

create table public.rifa_premios (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.rifas(event_id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  photo text not null check (btrim(photo) <> ''),
  display_order smallint not null check (display_order > 0),
  winning_number integer,
  winner_name text,
  drawn_at timestamptz,
  unique (event_id, display_order),
  check ((winning_number is null and winner_name is null and drawn_at is null)
    or (winning_number is not null and btrim(winner_name) <> '' and drawn_at is not null))
);

create unique index rifa_premios_one_win_per_number_idx
  on public.rifa_premios (event_id, winning_number)
  where winning_number is not null;

create function public.is_valid_measurement_table(value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select value is null or (
    jsonb_typeof(value) = 'object'
    and jsonb_typeof(value -> 'sizes') = 'array'
    and jsonb_array_length(value -> 'sizes') > 0
    and jsonb_typeof(value -> 'sections') = 'array'
    and jsonb_array_length(value -> 'sections') > 0
    and not exists (
      select 1
      from jsonb_array_elements(value -> 'sections') as sections(section_value)
      where btrim(coalesce(section_value ->> 'title', '')) = ''
        or jsonb_typeof(section_value -> 'rows') <> 'array'
        or jsonb_array_length(section_value -> 'rows') = 0
        or exists (
          select 1
          from jsonb_array_elements(section_value -> 'rows') as rows(row_value)
          where btrim(coalesce(row_value ->> 'label', '')) = ''
            or jsonb_typeof(row_value -> 'values') <> 'array'
            or jsonb_array_length(row_value -> 'values') <> jsonb_array_length(value -> 'sizes')
        )
    )
  );
$$;

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.eventos(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  description text not null check (btrim(description) <> ''),
  photos text[] not null default '{}' check (cardinality(photos) <= 5),
  unit_price_cents integer not null check (unit_price_cents > 0),
  discount_min_quantity integer,
  discount_unit_price_cents integer,
  measurement_table jsonb,
  measurement_image text,
  display_order integer not null check (display_order > 0),
  unique (event_id, name),
  unique (event_id, display_order),
  check ((discount_min_quantity is null and discount_unit_price_cents is null)
    or (discount_min_quantity >= 2 and discount_unit_price_cents > 0 and discount_unit_price_cents < unit_price_cents)),
  check (num_nonnulls(measurement_table, measurement_image) <= 1),
  check (public.is_valid_measurement_table(measurement_table))
);

create table public.produto_variacoes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.produtos(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  display_order integer not null check (display_order > 0),
  unique (product_id, name),
  unique (product_id, display_order)
);

create table public.produto_variacao_opcoes (
  id uuid primary key default gen_random_uuid(),
  variation_id uuid not null references public.produto_variacoes(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  display_order integer not null check (display_order > 0),
  unique (variation_id, name),
  unique (variation_id, display_order)
);

create table public.sessoes_reserva (
  id uuid primary key default gen_random_uuid(),
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.eventos(id) on delete cascade,
  session_id uuid not null references public.sessoes_reserva(id) on delete restrict,
  status public.reserva_status not null default 'pendente',
  customer_name text check (customer_name is null or btrim(customer_name) <> ''),
  customer_contact text check (customer_contact is null or btrim(customer_contact) <> ''),
  total_cents bigint not null check (total_cents > 0),
  receipt_saved boolean not null default false,
  expires_at timestamptz not null,
  paid_at timestamptz,
  canceled_at timestamptz,
  delivered_at timestamptz,
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((customer_name is null) = (customer_contact is null)),
  check (customer_name is not null or personal_data_deleted_at is not null)
);

create table public.reserva_produtos (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservas(id) on delete cascade,
  product_id uuid references public.produtos(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents > 0)
);

create table public.reserva_produto_opcoes (
  reservation_product_id uuid not null references public.reserva_produtos(id) on delete cascade,
  variation_id uuid references public.produto_variacoes(id) on delete set null,
  option_id uuid references public.produto_variacao_opcoes(id) on delete set null,
  variation_name text not null,
  option_name text not null,
  unique (reservation_product_id, variation_id)
);

create table public.reserva_numeros (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservas(id) on delete cascade,
  raffle_id uuid not null references public.rifas(event_id) on delete cascade,
  number integer not null check (number > 0),
  price_cents integer not null check (price_cents > 0),
  released_at timestamptz
);

create unique index reserva_numeros_available_idx
  on public.reserva_numeros (raffle_id, number)
  where released_at is null;

create table public.event_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  event_name text not null,
  deleted_by uuid references auth.users(id),
  export_email text not null,
  export_sent_at timestamptz not null,
  deleted_at timestamptz not null default now()
);

create trigger event_settings_set_updated_at before update on public.event_settings
  for each row execute function public.set_updated_at();
create trigger eventos_set_updated_at before update on public.eventos
  for each row execute function public.set_updated_at();
create trigger sessoes_reserva_set_updated_at before update on public.sessoes_reserva
  for each row execute function public.set_updated_at();
create trigger reservas_set_updated_at before update on public.reservas
  for each row execute function public.set_updated_at();

create function public.validate_event_child_type()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  expected_type public.evento_tipo := case tg_table_name when 'rifas' then 'rifa'::public.evento_tipo else 'produtos'::public.evento_tipo end;
begin
  if not exists (
    select 1 from public.eventos
    where id = new.event_id and type = expected_type
  ) then
    raise exception 'O item não corresponde ao tipo do evento.';
  end if;
  return new;
end;
$$;

create trigger rifas_validate_event before insert or update on public.rifas
  for each row execute function public.validate_event_child_type();
create trigger produtos_validate_event before insert or update on public.produtos
  for each row execute function public.validate_event_child_type();

create function public.validate_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prize_count integer;
begin
  if new.type <> old.type and exists (select 1 from public.reservas where event_id = old.id) then
    raise exception 'O tipo do evento não pode mudar depois da primeira reserva.';
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'rascunho' and new.status = 'ativo') or
      (old.status = 'ativo' and new.status = 'encerrado') or
      (old.status = 'encerrado' and new.status in ('ativo', 'arquivado'))
    ) then
      raise exception 'Transição de status inválida: % para %.', old.status, new.status;
    end if;

    if new.status = 'ativo' then
      if new.data_verified_at is null then
        raise exception 'Confirme a verificação dos dados reais antes de publicar.';
      end if;
      if cardinality(new.photos) = 0 then
        raise exception 'Adicione ao menos uma imagem antes de publicar.';
      end if;
      if current_date not between new.start_date and new.end_date then
        raise exception 'Um evento só pode ficar ativo dentro do período informado.';
      end if;
      if new.pix_copy_paste is null then
        raise exception 'Informe um código Pix copia e cola real antes de publicar.';
      end if;
      if new.type = 'rifa' then
        if not exists (select 1 from public.rifas where event_id = new.id) then
          raise exception 'Configure a rifa antes de publicar.';
        end if;
        select count(*) into prize_count from public.rifa_premios where event_id = new.id;
        if prize_count = 0 then raise exception 'Adicione ao menos um prêmio antes de publicar.'; end if;
      elsif not exists (select 1 from public.produtos where event_id = new.id) then
        raise exception 'Adicione ao menos um produto antes de publicar.';
      end if;
      new.activated_at := coalesce(new.activated_at, now());
      new.ended_at := null;
      new.archived_at := null;
    elsif new.status = 'encerrado' then
      new.ended_at := now();
    elsif new.status = 'arquivado' then
      new.archived_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger eventos_validate_update before update on public.eventos
  for each row execute function public.validate_event_update();

create function public.validate_event_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'rascunho' or current_setting('app.confirmed_event_delete', true) = 'on' then
    return old;
  end if;
  raise exception 'Somente rascunhos podem ser removidos diretamente.';
end;
$$;

create trigger eventos_validate_delete before delete on public.eventos
  for each row execute function public.validate_event_delete();

create function public.validate_reservation_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then return new; end if;

  if old.status = 'pendente' and new.status = 'paga' then
    new.paid_at := now();
  elsif old.status in ('pendente', 'paga') and new.status = 'cancelada' then
    if old.status = 'paga' and exists (
      select 1
      from public.reserva_numeros rn
      join public.rifa_premios rp on rp.event_id = rn.raffle_id and rp.winning_number = rn.number
      where rn.reservation_id = old.id
    ) then
      raise exception 'Uma reserva sorteada não pode ser cancelada.';
    end if;
    new.canceled_at := now();
  elsif old.status = 'paga' and new.status = 'entregue' then
    if not exists (
      select 1 from public.eventos e
      where e.id = old.event_id
        and e.status in ('encerrado', 'arquivado')
        and (
          e.type = 'produtos'
          or exists (
            select 1
            from public.reserva_numeros rn
            join public.rifa_premios rp on rp.event_id = e.id and rp.winning_number = rn.number
            where rn.reservation_id = old.id
          )
        )
    ) then
      raise exception 'A reserva ainda não pode ser marcada como entregue.';
    end if;
    new.delivered_at := now();
  else
    raise exception 'Transição de reserva inválida: % para %.', old.status, new.status;
  end if;
  return new;
end;
$$;

create trigger reservas_validate_status before update of status on public.reservas
  for each row execute function public.validate_reservation_status();

create function public.release_canceled_raffle_numbers()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'cancelada' and old.status <> 'cancelada' then
    update public.reserva_numeros set released_at = now()
    where reservation_id = new.id and released_at is null;
  end if;
  return new;
end;
$$;

create trigger reservas_release_numbers after update of status on public.reservas
  for each row execute function public.release_canceled_raffle_numbers();

alter table public.event_settings enable row level security;
alter table public.eventos enable row level security;
alter table public.rifas enable row level security;
alter table public.rifa_premios enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_variacoes enable row level security;
alter table public.produto_variacao_opcoes enable row level security;
alter table public.sessoes_reserva enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_produtos enable row level security;
alter table public.reserva_produto_opcoes enable row level security;
alter table public.reserva_numeros enable row level security;
alter table public.event_deletion_audit enable row level security;

create view public.eventos_public as
  select id, name, description, type, status, photos, start_date, end_date,
    fundraising_goal_cents, max_items_per_reservation,
    extract(epoch from reservation_ttl)::integer as reservation_ttl_seconds,
    pix_copy_paste, post_payment_instructions, created_at
  from public.eventos
  where status in ('ativo', 'encerrado')
    and (status = 'encerrado' or current_date between start_date and end_date)
  order by case status when 'ativo' then 0 else 1 end, end_date desc;

create view public.produtos_public as
  select p.id, p.event_id, p.name, p.description, p.photos, p.unit_price_cents,
    p.discount_min_quantity, p.discount_unit_price_cents, p.measurement_table,
    p.measurement_image, p.display_order
  from public.produtos p
  join public.eventos e on e.id = p.event_id
  where e.status in ('ativo', 'encerrado') and e.type = 'produtos'
  order by p.display_order;

create view public.produto_variacoes_public as
  select v.id, v.product_id, v.name, v.display_order
  from public.produto_variacoes v
  join public.produtos p on p.id = v.product_id
  join public.eventos e on e.id = p.event_id
  where e.status in ('ativo', 'encerrado')
  order by v.display_order;

create view public.produto_variacao_opcoes_public as
  select o.id, o.variation_id, o.name, o.display_order
  from public.produto_variacao_opcoes o
  join public.produto_variacoes v on v.id = o.variation_id
  join public.produtos p on p.id = v.product_id
  join public.eventos e on e.id = p.event_id
  where e.status in ('ativo', 'encerrado')
  order by o.display_order;

create view public.rifas_public as
  select r.event_id, r.total_numbers, r.number_price_cents
  from public.rifas r
  join public.eventos e on e.id = r.event_id
  where e.status in ('ativo', 'encerrado') and e.type = 'rifa';

create view public.rifa_premios_public as
  select p.id, p.event_id, p.name, p.photo, p.display_order,
    p.winning_number, p.winner_name, p.drawn_at
  from public.rifa_premios p
  join public.eventos e on e.id = p.event_id
  where e.status in ('ativo', 'encerrado')
  order by p.display_order;

create view public.rifa_numeros_public as
  select r.event_id, number.value as number,
    not exists (
      select 1 from public.reserva_numeros rn
      where rn.raffle_id = r.event_id and rn.number = number.value and rn.released_at is null
    ) as available
  from public.rifas r
  join public.eventos e on e.id = r.event_id
  cross join lateral generate_series(1, r.total_numbers) as number(value)
  where e.status = 'ativo' and current_date between e.start_date and e.end_date;

grant select on public.eventos_public, public.produtos_public,
  public.produto_variacoes_public, public.produto_variacao_opcoes_public,
  public.rifas_public, public.rifa_premios_public, public.rifa_numeros_public
  to anon, authenticated;

create function public.create_reservation_session()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  insert into public.sessoes_reserva default values returning id into session_id;
  return session_id;
end;
$$;

create function public.expire_event_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.eventos set status = 'encerrado'
  where status = 'ativo' and end_date < current_date;

  update public.reservas
  set status = 'cancelada'
  where status = 'pendente' and expires_at <= now();
  get diagnostics affected = row_count;

  delete from public.sessoes_reserva s
  where s.updated_at < now() - interval '30 days'
    and not exists (select 1 from public.reservas r where r.session_id = s.id);
  return affected;
end;
$$;

create function public.reserve_raffle_numbers(
  p_event_id uuid,
  p_session_id uuid,
  p_customer_name text,
  p_customer_contact text,
  p_numbers integer[]
)
returns table (
  reservation_id uuid,
  total_cents bigint,
  expires_at timestamptz,
  pix_copy_paste text,
  post_payment_instructions text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.eventos%rowtype;
  raffle public.rifas%rowtype;
  settings public.event_settings%rowtype;
  effective_limit integer;
  effective_ttl interval;
  new_reservation_id uuid;
  selected_count integer;
begin
  perform public.expire_event_reservations();
  select * into settings from public.event_settings where singleton;
  select * into selected_event from public.eventos where id = p_event_id for share;
  select * into raffle from public.rifas where event_id = p_event_id;

  if selected_event.id is null or selected_event.type <> 'rifa' or selected_event.status <> 'ativo'
    or current_date not between selected_event.start_date and selected_event.end_date then
    raise exception 'Esta rifa não aceita reservas.';
  end if;
  if raffle.event_id is null then raise exception 'Rifa não configurada.'; end if;
  if btrim(coalesce(p_customer_name, '')) = '' or btrim(coalesce(p_customer_contact, '')) = '' then
    raise exception 'Nome e contato são obrigatórios.';
  end if;
  if not exists (select 1 from public.sessoes_reserva where id = p_session_id for update) then
    raise exception 'Sessão de reserva inválida.';
  end if;
  if exists (
    select 1 from public.sessoes_reserva
    where id = p_session_id and last_attempt_at > now() - interval '2 seconds'
  ) then
    raise exception 'Aguarde antes de tentar outra reserva.';
  end if;

  selected_count := coalesce(cardinality(p_numbers), 0);
  effective_limit := coalesce(selected_event.max_items_per_reservation, settings.default_max_raffle_numbers);
  if selected_count = 0 or selected_count > effective_limit then
    raise exception 'Selecione de 1 a % números.', effective_limit;
  end if;
  if (select count(distinct value) from unnest(p_numbers) value) <> selected_count
    or exists (select 1 from unnest(p_numbers) value where value not between 1 and raffle.total_numbers) then
    raise exception 'A seleção contém números inválidos.';
  end if;

  effective_ttl := coalesce(selected_event.reservation_ttl, settings.default_reservation_ttl);
  insert into public.reservas (
    event_id, session_id, customer_name, customer_contact, total_cents, expires_at
  ) values (
    p_event_id, p_session_id, btrim(p_customer_name), btrim(p_customer_contact),
    selected_count::bigint * raffle.number_price_cents,
    least(now() + effective_ttl, (selected_event.end_date + 1)::timestamptz)
  ) returning id into new_reservation_id;

  begin
    insert into public.reserva_numeros (reservation_id, raffle_id, number, price_cents)
      select new_reservation_id, p_event_id, value, raffle.number_price_cents
      from unnest(p_numbers) value;
  exception when unique_violation then
    raise exception 'Um ou mais números acabaram de ser reservados. Atualize a seleção.';
  end;

  update public.sessoes_reserva set last_attempt_at = now() where id = p_session_id;
  return query
    select new_reservation_id, r.total_cents, r.expires_at,
      selected_event.pix_copy_paste, selected_event.post_payment_instructions
    from public.reservas r where r.id = new_reservation_id;
end;
$$;

create function public.reserve_product_items(
  p_event_id uuid,
  p_session_id uuid,
  p_customer_name text,
  p_customer_contact text,
  p_items jsonb
)
returns table (
  reservation_id uuid,
  total_cents bigint,
  expires_at timestamptz,
  pix_copy_paste text,
  post_payment_instructions text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.eventos%rowtype;
  settings public.event_settings%rowtype;
  product public.produtos%rowtype;
  variation public.produto_variacoes%rowtype;
  option_row public.produto_variacao_opcoes%rowtype;
  item jsonb;
  options jsonb;
  product_id uuid;
  option_id uuid;
  reservation_product_id uuid;
  new_reservation_id uuid;
  effective_limit integer;
  effective_ttl interval;
  item_count integer;
  product_count integer;
  item_price integer;
  calculated_total bigint := 0;
begin
  perform public.expire_event_reservations();
  select * into settings from public.event_settings where singleton;
  select * into selected_event from public.eventos where id = p_event_id for share;

  if selected_event.id is null or selected_event.type <> 'produtos' or selected_event.status <> 'ativo'
    or current_date not between selected_event.start_date and selected_event.end_date then
    raise exception 'Este evento não aceita reservas.';
  end if;
  if btrim(coalesce(p_customer_name, '')) = '' or btrim(coalesce(p_customer_contact, '')) = '' then
    raise exception 'Nome e contato são obrigatórios.';
  end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'Itens inválidos.'; end if;
  item_count := jsonb_array_length(p_items);
  effective_limit := coalesce(selected_event.max_items_per_reservation, settings.default_max_product_units);
  if item_count = 0 or item_count > effective_limit then
    raise exception 'Selecione de 1 a % unidades.', effective_limit;
  end if;
  if not exists (select 1 from public.sessoes_reserva where id = p_session_id for update) then
    raise exception 'Sessão de reserva inválida.';
  end if;
  if exists (
    select 1 from public.sessoes_reserva
    where id = p_session_id and last_attempt_at > now() - interval '2 seconds'
  ) then
    raise exception 'Aguarde antes de tentar outra reserva.';
  end if;

  for item in select value from jsonb_array_elements(p_items) loop
    begin product_id := (item ->> 'productId')::uuid;
    exception when others then raise exception 'Produto inválido.'; end;
    select * into product from public.produtos p where p.id = product_id and p.event_id = p_event_id;
    if product.id is null then raise exception 'Produto inválido.'; end if;
    select count(*) into product_count
      from jsonb_array_elements(p_items) other
      where other ->> 'productId' = product_id::text;
    item_price := case
      when product.discount_min_quantity is not null and product_count >= product.discount_min_quantity
        then product.discount_unit_price_cents
      else product.unit_price_cents
    end;
    calculated_total := calculated_total + item_price;

    options := coalesce(item -> 'options', '{}'::jsonb);
    if jsonb_typeof(options) <> 'object' or (select count(*) from jsonb_object_keys(options)) <>
      (select count(*) from public.produto_variacoes pv where pv.product_id = product.id) then
      raise exception 'Escolha uma opção de cada variação de %.', product.name;
    end if;
    for variation in select * from public.produto_variacoes pv where pv.product_id = product.id loop
      begin option_id := (options ->> variation.id::text)::uuid;
      exception when others then raise exception 'Opção inválida para %.', variation.name; end;
      if not exists (
        select 1 from public.produto_variacao_opcoes pvo
        where pvo.id = option_id and pvo.variation_id = variation.id
      ) then
        raise exception 'Opção inválida para %.', variation.name;
      end if;
    end loop;
  end loop;

  effective_ttl := coalesce(selected_event.reservation_ttl, settings.default_reservation_ttl);
  insert into public.reservas (
    event_id, session_id, customer_name, customer_contact, total_cents, expires_at
  ) values (
    p_event_id, p_session_id, btrim(p_customer_name), btrim(p_customer_contact), calculated_total,
    least(now() + effective_ttl, (selected_event.end_date + 1)::timestamptz)
  ) returning id into new_reservation_id;

  for item in select value from jsonb_array_elements(p_items) loop
    product_id := (item ->> 'productId')::uuid;
    select * into product from public.produtos p where p.id = product_id;
    select count(*) into product_count
      from jsonb_array_elements(p_items) other
      where other ->> 'productId' = product_id::text;
    item_price := case
      when product.discount_min_quantity is not null and product_count >= product.discount_min_quantity
        then product.discount_unit_price_cents
      else product.unit_price_cents
    end;
    insert into public.reserva_produtos (
      reservation_id, product_id, product_name, unit_price_cents
    ) values (
      new_reservation_id, product.id, product.name, item_price
    ) returning id into reservation_product_id;

    options := coalesce(item -> 'options', '{}'::jsonb);
    for variation in select * from public.produto_variacoes pv where pv.product_id = product.id loop
      option_id := (options ->> variation.id::text)::uuid;
      select * into option_row from public.produto_variacao_opcoes pvo where pvo.id = option_id;
      insert into public.reserva_produto_opcoes (
        reservation_product_id, variation_id, option_id, variation_name, option_name
      ) values (
        reservation_product_id, variation.id, option_row.id, variation.name, option_row.name
      );
    end loop;
  end loop;

  update public.sessoes_reserva set last_attempt_at = now() where id = p_session_id;
  return query
    select new_reservation_id, r.total_cents, r.expires_at,
      selected_event.pix_copy_paste, selected_event.post_payment_instructions
    from public.reservas r where r.id = new_reservation_id;
end;
$$;

create function public.draw_raffle_prize(p_prize_id uuid)
returns table (
  prize_id uuid,
  winning_number integer,
  winner_name text,
  drawn_at timestamptz
)
language plpgsql
security definer
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
  return next;
end;
$$;

create function public.delete_archived_event(
  p_event_id uuid,
  p_export_sent_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_event public.eventos%rowtype;
  export_email text;
begin
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
    event_id, event_name, deleted_by, export_email, export_sent_at
  ) values (
    selected_event.id, selected_event.name, auth.uid(), export_email, p_export_sent_at
  );
  perform set_config('app.confirmed_event_delete', 'on', true);
  delete from public.eventos where id = selected_event.id;
end;
$$;

create function public.clean_expired_event_personal_data()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.reservas r
  set customer_name = null,
    customer_contact = null,
    personal_data_deleted_at = now()
  from public.eventos e
  where e.id = r.event_id
    and e.status in ('encerrado', 'arquivado')
    and e.ended_at < now() - interval '90 days'
    and r.personal_data_deleted_at is null;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.create_reservation_session() from public;
revoke all on function public.expire_event_reservations() from public;
revoke all on function public.reserve_raffle_numbers(uuid, uuid, text, text, integer[]) from public;
revoke all on function public.reserve_product_items(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.draw_raffle_prize(uuid) from public;
revoke all on function public.delete_archived_event(uuid, timestamptz) from public;
revoke all on function public.clean_expired_event_personal_data() from public;
grant execute on function public.create_reservation_session() to anon, authenticated;
grant execute on function public.reserve_raffle_numbers(uuid, uuid, text, text, integer[]) to anon, authenticated;
grant execute on function public.reserve_product_items(uuid, uuid, text, text, jsonb) to anon, authenticated;

select cron.schedule(
  'expire-event-reservations',
  '* * * * *',
  'select public.expire_event_reservations()'
);

select cron.schedule(
  'clean-event-personal-data',
  '15 3 * * *',
  'select public.clean_expired_event_personal_data()'
);
