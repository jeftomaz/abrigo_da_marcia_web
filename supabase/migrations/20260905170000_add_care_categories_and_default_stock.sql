-- Categorias passam a ser configuráveis e todo item mantém estoque automático.

create table public.cuidado_categorias (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (
    name = btrim(name)
    and char_length(name) between 1 and 40
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema'
);

create unique index cuidado_categorias_name_unique
  on public.cuidado_categorias (lower(name));

create trigger cuidado_categorias_set_updated_at
before update on public.cuidado_categorias
for each row execute function public.set_updated_at();

create trigger cuidado_categorias_set_audit_metadata
before insert or update on public.cuidado_categorias
for each row execute function public.set_audit_metadata();

with canonical_categories as (
  select lower(category) as normalized_name, min(category) as canonical_name
  from public.cuidado_itens
  group by lower(category)
)
update public.cuidado_itens item
set category = canonical.canonical_name
from canonical_categories canonical
where lower(item.category) = canonical.normalized_name
  and item.category <> canonical.canonical_name;

insert into public.cuidado_categorias (name)
select distinct item.category
from public.cuidado_itens item;

insert into public.cuidado_categorias (id, name)
select default_category.id::uuid, default_category.name
from (values
  ('72000000-0000-0000-0000-000000000001', 'Vacina'),
  ('72000000-0000-0000-0000-000000000002', 'Medicamento'),
  ('72000000-0000-0000-0000-000000000003', 'Exame'),
  ('72000000-0000-0000-0000-000000000004', 'Suplemento'),
  ('72000000-0000-0000-0000-000000000005', 'Procedimento'),
  ('72000000-0000-0000-0000-000000000006', 'Outro')
) as default_category(id, name)
where not exists (
  select 1
  from public.cuidado_categorias category
  where lower(category.name) = lower(default_category.name)
);

alter table public.cuidado_itens
  add constraint cuidado_itens_category_fkey
  foreign key (category) references public.cuidado_categorias(name)
  on update cascade on delete restrict;

with backfilled_items as (
  update public.cuidado_itens
  set stock_quantity = 0
  where stock_quantity is null
  returning id
)
insert into public.cuidado_estoque_movimentos (
  item_id, source, previous_quantity, new_quantity, reason
)
select
  item.id,
  'ajuste_manual',
  null,
  0,
  'Ativação do controle automático de estoque.'
from backfilled_items item;

alter table public.cuidado_itens
  alter column stock_quantity set default 0,
  alter column stock_quantity set not null;

create function public.save_care_categories(p_categories jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category jsonb;
  category_id uuid;
begin
  if jsonb_typeof(p_categories) <> 'array'
    or jsonb_array_length(p_categories) < 1
    or jsonb_array_length(p_categories) > 100 then
    raise exception using
      errcode = '23514',
      message = 'Informe entre 1 e 100 categorias.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_categories) entry
    where nullif(entry ->> 'id', '') is not null
    group by entry ->> 'id'
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'A lista contém uma categoria repetida.';
  end if;

  for category in select value from jsonb_array_elements(p_categories)
  loop
    category_id := nullif(category ->> 'id', '')::uuid;
    if category_id is null then
      insert into public.cuidado_categorias (name, active)
      values (
        btrim(category ->> 'name'),
        (category ->> 'active')::boolean
      );
    else
      update public.cuidado_categorias
      set
        name = btrim(category ->> 'name'),
        active = (category ->> 'active')::boolean
      where id = category_id;

      if not found then
        raise exception using
          errcode = 'P0002',
          message = 'Categoria de cuidado não encontrada.';
      end if;
    end if;
  end loop;
end;
$$;

create function public.validate_care_item_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_is_active boolean;
begin
  if tg_op = 'UPDATE' and new.category = old.category then
    return new;
  end if;

  select category.active into category_is_active
  from public.cuidado_categorias category
  where category.name = new.category
  for share;

  if not found or not category_is_active then
    raise exception using
      errcode = '23514',
      message = 'Selecione uma categoria de cuidado ativa.';
  end if;

  return new;
end;
$$;

create trigger cuidado_itens_validate_category
before insert or update of category on public.cuidado_itens
for each row execute function public.validate_care_item_category();

revoke all on function public.save_care_categories(jsonb) from public, anon;
revoke all on function public.validate_care_item_category() from public;
grant execute on function public.save_care_categories(jsonb) to authenticated;

alter table public.cuidado_categorias enable row level security;

create policy "Admins manage cuidado_categorias"
on public.cuidado_categorias for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "MFA protects cuidado_categorias"
on public.cuidado_categorias as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2')
with check ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.cuidado_categorias from anon;
grant select, insert, update on public.cuidado_categorias to authenticated;
