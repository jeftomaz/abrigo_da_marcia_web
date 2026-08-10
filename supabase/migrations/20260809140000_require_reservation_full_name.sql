create function public.is_valid_reservation_name(value text)
returns boolean
language sql
immutable
strict
set search_path = ''
as $$
  select btrim(value) ~ '[^[:space:]]+[[:space:]]+[^[:space:]]+'
$$;

create function public.validate_reservation_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.customer_name is null then return new; end if;
  if not public.is_valid_reservation_name(new.customer_name) then
    raise exception 'Informe pelo menos dois nomes.';
  end if;
  return new;
end;
$$;

create trigger reservas_validate_name
  before insert or update of customer_name on public.reservas
  for each row execute function public.validate_reservation_name();
