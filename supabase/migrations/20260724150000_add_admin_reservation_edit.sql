create function public.update_event_reservation(
  p_reservation_id uuid,
  p_customer_name text,
  p_customer_contact text,
  p_status public.reserva_status,
  p_receipt_saved boolean,
  p_numbers integer[],
  p_items jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  selected_reservation public.reservas%rowtype;
  selected_event public.eventos%rowtype;
  raffle public.rifas%rowtype;
  product public.produtos%rowtype;
  variation public.produto_variacoes%rowtype;
  option_row public.produto_variacao_opcoes%rowtype;
  item jsonb;
  options jsonb;
  product_id uuid;
  option_id uuid;
  reservation_product_id uuid;
  item_count integer;
  product_count integer;
  item_price integer;
  calculated_total bigint := 0;
begin
  select * into selected_reservation
  from public.reservas
  where id = p_reservation_id
  for update;

  if selected_reservation.id is null then raise exception 'Reserva não encontrada.'; end if;
  if selected_reservation.personal_data_deleted_at is not null then
    raise exception 'Os dados pessoais desta reserva já foram removidos.';
  end if;
  if selected_reservation.status in ('cancelada', 'entregue') then
    raise exception 'Reservas canceladas ou entregues não podem ser editadas.';
  end if;
  if btrim(coalesce(p_customer_name, '')) = '' or btrim(coalesce(p_customer_contact, '')) = '' then
    raise exception 'Nome e contato são obrigatórios.';
  end if;

  select * into selected_event from public.eventos where id = selected_reservation.event_id;

  if selected_event.type = 'rifa' then
    select * into raffle from public.rifas where event_id = selected_event.id;
    item_count := coalesce(cardinality(p_numbers), 0);
    if item_count = 0 then raise exception 'Selecione ao menos um número.'; end if;
    if (select count(distinct value) from unnest(p_numbers) value) <> item_count
      or exists (select 1 from unnest(p_numbers) value where value not between 1 and raffle.total_numbers) then
      raise exception 'A seleção contém números inválidos.';
    end if;
    if exists (
      select 1
      from public.reserva_numeros rn
      join public.rifa_premios rp
        on rp.event_id = rn.raffle_id and rp.winning_number = rn.number
      where rn.reservation_id = selected_reservation.id
        and rn.released_at is null
    ) and p_numbers is distinct from (
      select array_agg(rn.number order by rn.number)
      from public.reserva_numeros rn
      where rn.reservation_id = selected_reservation.id and rn.released_at is null
    ) then
      raise exception 'Os números de uma reserva já sorteada não podem ser alterados.';
    end if;

    delete from public.reserva_numeros
    where reservation_id = selected_reservation.id and released_at is null;
    begin
      insert into public.reserva_numeros (reservation_id, raffle_id, number, price_cents)
        select selected_reservation.id, selected_event.id, value, raffle.number_price_cents
        from unnest(p_numbers) value;
    exception when unique_violation then
      raise exception 'Um ou mais números já pertencem a outra reserva.';
    end;
    calculated_total := item_count::bigint * raffle.number_price_cents;
  else
    if jsonb_typeof(p_items) <> 'array' then raise exception 'Itens inválidos.'; end if;
    item_count := jsonb_array_length(p_items);
    if item_count = 0 then raise exception 'Adicione ao menos um item.'; end if;

    for item in select value from jsonb_array_elements(p_items) loop
      begin product_id := (item ->> 'productId')::uuid;
      exception when others then raise exception 'Produto inválido.'; end;
      select * into product
      from public.produtos p
      where p.id = product_id and p.event_id = selected_event.id;
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
        ) then raise exception 'Opção inválida para %.', variation.name; end if;
      end loop;
    end loop;

    delete from public.reserva_produtos where reservation_id = selected_reservation.id;
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
        selected_reservation.id, product.id, product.name, item_price
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
  end if;

  update public.reservas
  set customer_name = btrim(p_customer_name),
      customer_contact = p_customer_contact,
      total_cents = calculated_total,
      receipt_saved = p_receipt_saved,
      status = p_status
  where id = selected_reservation.id;
end;
$$;

revoke all on function public.update_event_reservation(
  uuid, text, text, public.reserva_status, boolean, integer[], jsonb
) from public, anon;
grant execute on function public.update_event_reservation(
  uuid, text, text, public.reserva_status, boolean, integer[], jsonb
) to authenticated;
