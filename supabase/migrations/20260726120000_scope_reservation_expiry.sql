-- Hardening: no caminho quente da reserva, liberar só as reservas vencidas do
-- evento em questão, em vez de varrer todos os eventos/reservas e limpar
-- sessões/IPs. A varredura global e a limpeza continuam no cron de 1 minuto
-- (expire_event_reservations). As RPCs já rejeitam evento fora do período, então
-- fechar eventos vencidos não precisa acontecer aqui.

create function public.expire_reservations_for_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.reservas
  set status = 'cancelada'
  where event_id = p_event_id and status = 'pendente' and expires_at <= now();
end;
$$;

revoke all on function public.expire_reservations_for_event(uuid) from public;

-- Recria as duas RPCs públicas trocando apenas a chamada de expiração global pela
-- versão restrita ao evento; o restante do corpo é idêntico ao de 20260724130000.
create or replace function public.reserve_raffle_numbers(
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
  pix_key text,
  pix_receiver text,
  pix_city text,
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
  perform public.expire_reservations_for_event(p_event_id);
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
      selected_event.pix_key, selected_event.pix_receiver, selected_event.pix_city,
      selected_event.post_payment_instructions
    from public.reservas r where r.id = new_reservation_id;
end;
$$;

create or replace function public.reserve_product_items(
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
  pix_key text,
  pix_receiver text,
  pix_city text,
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
  perform public.expire_reservations_for_event(p_event_id);
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
      selected_event.pix_key, selected_event.pix_receiver, selected_event.pix_city,
      selected_event.post_payment_instructions
    from public.reservas r where r.id = new_reservation_id;
end;
$$;
