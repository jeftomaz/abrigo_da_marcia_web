-- Apresentação legada não participa mais da identidade funcional do item.

create function public.validate_care_item_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_identity text;
begin
  if tg_op = 'UPDATE'
    and lower(btrim(new.name)) = lower(btrim(old.name))
    and lower(btrim(new.category)) = lower(btrim(old.category)) then
    return new;
  end if;

  normalized_identity := pg_catalog.jsonb_build_array(
    lower(btrim(new.name)),
    lower(btrim(new.category))
  )::text;
  perform pg_advisory_xact_lock(pg_catalog.hashtextextended(normalized_identity, 0));

  if exists (
    select 1
    from public.cuidado_itens item
    where item.id <> new.id
      and lower(item.name) = lower(btrim(new.name))
      and lower(item.category) = lower(btrim(new.category))
  ) then
    raise exception using
      errcode = '23505',
      message = 'Já existe um item de cuidado com este nome e categoria.';
  end if;

  return new;
end;
$$;

create trigger cuidado_itens_validate_identity
before insert or update of name, category on public.cuidado_itens
for each row execute function public.validate_care_item_identity();

revoke all on function public.validate_care_item_identity() from public;
