-- Configurações gerais: chave, recebedor e cidade do Pix passam a ter uma fonte única,
-- compartilhada por doação e eventos. O copia-e-cola deixa de ser digitado pelo admin:
-- é gerado no client pela especificação BR Code (EMV MPM) do Banco Central, já com o
-- valor de cada doação ou reserva — por isso nenhuma coluna guarda o código pronto.

-- 1. site_settings deixa de tratar o Pix como exclusivo da doação.
alter table public.site_settings rename column donation_pix_key to pix_key;
alter table public.site_settings rename column donation_pix_receiver to pix_receiver;
alter table public.site_settings rename column donation_pix_city to pix_city;
alter table public.site_settings rename constraint site_settings_donation_pix_key_check to site_settings_pix_key_check;
alter table public.site_settings rename constraint site_settings_donation_pix_receiver_check to site_settings_pix_receiver_check;
alter table public.site_settings rename constraint site_settings_donation_pix_city_check to site_settings_pix_city_check;
alter table public.site_settings rename constraint site_settings_donation_pix_complete_check to site_settings_pix_complete_check;

-- 2. Os padrões de Eventos param de duplicar o Pix; valores já cadastrados migram para o global.
update public.site_settings s
set pix_key = e.default_pix_key,
    pix_receiver = e.default_pix_receiver,
    pix_city = e.default_pix_city
from public.event_settings e
where s.singleton and e.singleton and s.pix_key is null
  and e.default_pix_key is not null
  and e.default_pix_receiver is not null
  and e.default_pix_city is not null;

alter table public.event_settings
  drop column default_pix_key,
  drop column default_pix_receiver,
  drop column default_pix_city,
  drop column default_pix_copy_paste;

-- 3. O evento guarda os três dados do Pix (override por evento), nunca o código pronto.
update public.eventos e
set pix_key = coalesce(e.pix_key, s.pix_key),
    pix_receiver = coalesce(e.pix_receiver, s.pix_receiver),
    pix_city = coalesce(e.pix_city, s.pix_city)
from public.site_settings s
where s.singleton and e.status <> 'rascunho';

drop view public.eventos_public;
alter table public.eventos drop constraint eventos_complete_outside_draft_check;
alter table public.eventos drop column pix_copy_paste;
alter table public.eventos
  add constraint eventos_complete_outside_draft_check
  check (
    status = 'rascunho' or (
      draft_payload is null
      and name is not null
      and description is not null
      and start_date is not null
      and end_date is not null
      and fundraising_goal_cents is not null
      and cardinality(photos) > 0
      and pix_key is not null
      and pix_receiver is not null
      and pix_city is not null
      and post_payment_instructions is not null
      and data_verified_at is not null
    )
  );

create or replace function public.validate_event_update()
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
      if new.draft_payload is not null then
        raise exception 'Conclua e salve todos os campos do rascunho antes de publicar.';
      end if;
      if new.name is null or btrim(new.name) = '' then
        raise exception 'Preencha o título antes de publicar.';
      end if;
      if new.description is null or btrim(new.description) = '' then
        raise exception 'Preencha a descrição antes de publicar.';
      end if;
      if new.start_date is null then
        raise exception 'Informe a data de início antes de publicar.';
      end if;
      if new.end_date is null then
        raise exception 'Informe a data de fim antes de publicar.';
      end if;
      if new.fundraising_goal_cents is null then
        raise exception 'Informe a meta de arrecadação antes de publicar.';
      end if;
      if new.post_payment_instructions is null or btrim(new.post_payment_instructions) = '' then
        raise exception 'Preencha as instruções pós-pagamento antes de publicar.';
      end if;
      if new.data_verified_at is null then
        raise exception 'Confirme a verificação dos dados reais antes de publicar.';
      end if;
      if cardinality(new.photos) = 0 then
        raise exception 'Adicione ao menos uma imagem antes de publicar.';
      end if;
      if current_date not between new.start_date and new.end_date then
        raise exception 'Um evento só pode ficar ativo dentro do período informado.';
      end if;
      if new.pix_key is null or new.pix_receiver is null or new.pix_city is null then
        raise exception 'Informe chave, recebedor e cidade do Pix antes de publicar.';
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

-- 4. Views públicas passam a expor os dados do Pix; o código é montado no client.
drop view public.site_settings_public;
create view public.site_settings_public as
  select adoption_form_url, volunteer_form_url, pix_key, pix_receiver, pix_city,
    recurring_donation_urls
  from public.site_settings
  where singleton;

create view public.eventos_public as
  select id, name, description, type, status, photos, start_date, end_date,
    fundraising_goal_cents, max_items_per_reservation,
    extract(epoch from reservation_ttl)::integer as reservation_ttl_seconds,
    pix_key, pix_receiver, pix_city, post_payment_instructions, created_at
  from public.eventos
  where status in ('ativo', 'encerrado')
    and (status = 'encerrado' or current_date between start_date and end_date)
  order by case status when 'ativo' then 0 else 1 end, end_date desc;

grant select on public.site_settings_public, public.eventos_public to anon, authenticated;

-- 5. As reservas devolvem os dados do Pix no lugar do código pronto.
drop function public.reserve_raffle_numbers(uuid, uuid, text, text, integer[]);
drop function public.reserve_product_items(uuid, uuid, text, text, jsonb);

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
      selected_event.pix_key, selected_event.pix_receiver, selected_event.pix_city,
      selected_event.post_payment_instructions
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
      selected_event.pix_key, selected_event.pix_receiver, selected_event.pix_city,
      selected_event.post_payment_instructions
    from public.reservas r where r.id = new_reservation_id;
end;
$$;

revoke all on function public.reserve_raffle_numbers(uuid, uuid, text, text, integer[]) from public;
revoke all on function public.reserve_product_items(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.reserve_raffle_numbers(uuid, uuid, text, text, integer[]) to anon, authenticated;
grant execute on function public.reserve_product_items(uuid, uuid, text, text, jsonb) to anon, authenticated;
