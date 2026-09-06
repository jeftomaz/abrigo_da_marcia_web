-- A tranca de leitura do item roda com o dono sem devolver UPDATE direto ao client.

create or replace function public.validate_care_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_is_active boolean;
begin
  if new.active then
    select item.active into item_is_active
    from public.cuidado_itens item
    where item.id = new.item_id
    for share;

    if not found or not item_is_active then
      raise exception 'O programa exige um item de cuidado ativo.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_care_program() from public;
