-- Contatos de reserva são validados e normalizados em qualquer origem.

create function public.is_valid_reservation_contact(value text)
returns boolean
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  contact_value text := btrim(value);
  digits text;
  national_number text;
  area_code text;
  subscriber_number text;
  local_part text;
  domain_part text;
  domain_labels text[];
  domain_label text;
  top_level_domain text;
begin
  if position('@' in contact_value) > 0 then
    if length(contact_value) > 254
      or length(contact_value) - length(replace(contact_value, '@', '')) <> 1 then
      return false;
    end if;
    local_part := split_part(contact_value, '@', 1);
    domain_part := split_part(contact_value, '@', 2);
    if length(local_part) not between 1 and 64
      or local_part !~ '^[A-Za-z0-9!#$%&''*+/=?^_`{|}~.-]+$'
      or left(local_part, 1) = '.'
      or right(local_part, 1) = '.'
      or position('..' in local_part) > 0 then
      return false;
    end if;
    domain_labels := string_to_array(domain_part, '.');
    if cardinality(domain_labels) < 2 then return false; end if;
    foreach domain_label in array domain_labels loop
      if length(domain_label) not between 1 and 63
        or domain_label !~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$' then
        return false;
      end if;
    end loop;
    top_level_domain := domain_labels[cardinality(domain_labels)];
    return top_level_domain ~ '^[A-Za-z]{2,63}$'
      or top_level_domain ~* '^xn--[A-Za-z0-9-]{2,59}$';
  end if;

  digits := regexp_replace(contact_value, '[^0-9]', '', 'g');
  national_number := case
    when left(digits, 2) = '55' and length(digits) in (12, 13) then substr(digits, 3)
    else digits
  end;
  if length(national_number) not in (10, 11) then return false; end if;
  area_code := left(national_number, 2);
  if position(',' || area_code || ',' in ',11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99,') = 0 then
    return false;
  end if;
  subscriber_number := substr(national_number, 3);
  if replace(subscriber_number, left(subscriber_number, 1), '') = '' then return false; end if;
  if length(national_number) = 11 then return left(subscriber_number, 1) = '9'; end if;
  return left(subscriber_number, 1) in ('2', '3', '4', '5');
end;
$$;

create function public.normalize_reservation_contact(value text)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  contact_value text := btrim(value);
  digits text;
begin
  if position('@' in contact_value) > 0 then
    return split_part(contact_value, '@', 1) || '@' || lower(split_part(contact_value, '@', 2));
  end if;
  digits := regexp_replace(contact_value, '[^0-9]', '', 'g');
  if left(digits, 2) = '55' and length(digits) in (12, 13) then digits := substr(digits, 3); end if;
  return '+55' || digits;
end;
$$;

create function public.validate_reservation_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.customer_contact is null then return new; end if;
  if not public.is_valid_reservation_contact(new.customer_contact) then
    raise exception 'Informe um telefone com DDD válido ou um e-mail completo.';
  end if;
  new.customer_contact := public.normalize_reservation_contact(new.customer_contact);
  return new;
end;
$$;

create trigger reservas_validate_contact
  before insert or update of customer_contact on public.reservas
  for each row execute function public.validate_reservation_contact();
