-- Regras de integridade configuradas pelo formulário de Eventos.
alter table public.event_settings
  add constraint event_settings_ttl_whole_minutes_check
  check (
    default_reservation_ttl >= interval '1 minute'
    and mod(extract(epoch from default_reservation_ttl), 60) = 0
  );

alter table public.eventos
  add constraint eventos_ttl_whole_minutes_check
  check (
    reservation_ttl is null
    or (
      reservation_ttl >= interval '1 minute'
      and mod(extract(epoch from reservation_ttl), 60) = 0
    )
  );

create function public.enforce_reachable_product_discount()
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
  elsif tg_table_name = 'eventos' and new.type = 'produtos' then
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
  elsif tg_table_name = 'event_settings' and exists (
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

create trigger produtos_enforce_reachable_discount
  before insert or update of event_id, discount_min_quantity on public.produtos
  for each row execute function public.enforce_reachable_product_discount();

create trigger eventos_enforce_reachable_discount
  before update of max_items_per_reservation, type on public.eventos
  for each row execute function public.enforce_reachable_product_discount();

create trigger event_settings_enforce_reachable_discount
  before update of default_max_product_units on public.event_settings
  for each row execute function public.enforce_reachable_product_discount();
