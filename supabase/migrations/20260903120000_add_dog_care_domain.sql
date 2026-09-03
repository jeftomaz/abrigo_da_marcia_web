-- Domínio privado de cuidados: catálogo, programas, atribuições por cão e histórico.

create type public.cuidado_abrangencia as enum ('todos', 'selecionados');
create type public.cuidado_situacao as enum (
  'pendente',
  'em_andamento',
  'concluido',
  'suspenso',
  'dispensado'
);
create type public.cuidado_registro_tipo as enum (
  'aplicacao',
  'inicio',
  'observacao',
  'conclusao'
);

create table public.cuidado_itens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (
    name = btrim(name) and char_length(name) between 1 and 80
  ),
  category text not null check (
    category = btrim(category) and char_length(category) between 1 and 40
  ),
  presentation text check (
    presentation is null or (
      presentation = btrim(presentation)
      and char_length(presentation) between 1 and 80
    )
  ),
  notes text check (
    notes is null or (
      notes = btrim(notes) and char_length(notes) between 1 and 1000
    )
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema'
);

create unique index cuidado_itens_identity_unique
  on public.cuidado_itens (
    lower(category),
    lower(name),
    lower(coalesce(presentation, ''))
  );

create table public.cuidado_programas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cuidado_itens(id) on delete restrict,
  name text not null check (
    name = btrim(name) and char_length(name) between 1 and 80
  ),
  scope public.cuidado_abrangencia not null,
  default_dose text check (
    default_dose is null or (
      default_dose = btrim(default_dose)
      and char_length(default_dose) between 1 and 120
    )
  ),
  default_frequency text check (
    default_frequency is null or (
      default_frequency = btrim(default_frequency)
      and char_length(default_frequency) between 1 and 160
    )
  ),
  default_interval_days integer check (default_interval_days between 1 and 3650),
  instructions text check (
    instructions is null or (
      instructions = btrim(instructions)
      and char_length(instructions) between 1 and 1000
    )
  ),
  start_date date,
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema',
  check (end_date is null or start_date is null or end_date >= start_date)
);

create unique index cuidado_programas_item_name_unique
  on public.cuidado_programas (item_id, lower(name));

create table public.cae_cuidados (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.caes(id) on delete restrict,
  program_id uuid not null references public.cuidado_programas(id) on delete restrict,
  status public.cuidado_situacao not null default 'pendente',
  dose text check (
    dose is null or (
      dose = btrim(dose) and char_length(dose) between 1 and 120
    )
  ),
  frequency text check (
    frequency is null or (
      frequency = btrim(frequency)
      and char_length(frequency) between 1 and 160
    )
  ),
  start_date date,
  end_date date,
  next_due_on date,
  exception_reason text check (
    (
      status in ('suspenso', 'dispensado')
      and exception_reason is not null
      and exception_reason = btrim(exception_reason)
      and char_length(exception_reason) between 1 and 500
    ) or (
      status not in ('suspenso', 'dispensado')
      and exception_reason is null
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema',
  unique (dog_id, program_id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create index cae_cuidados_due_idx
  on public.cae_cuidados (next_due_on)
  where status in ('pendente', 'em_andamento');

create table public.cae_cuidado_registros (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.cae_cuidados(id) on delete restrict,
  type public.cuidado_registro_tipo not null,
  occurred_at timestamptz not null default now(),
  item_name text not null default '',
  item_category text not null default '',
  item_presentation text,
  dose text check (
    dose is null or (
      dose = btrim(dose) and char_length(dose) between 1 and 120
    )
  ),
  lot text check (
    lot is null or (
      lot = btrim(lot) and char_length(lot) between 1 and 100
    )
  ),
  notes text check (
    notes is null or (
      notes = btrim(notes) and char_length(notes) between 1 and 1000
    )
  ),
  next_due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema'
);

create index cae_cuidado_registros_timeline_idx
  on public.cae_cuidado_registros (assignment_id, occurred_at desc);

create trigger cuidado_itens_set_updated_at
before update on public.cuidado_itens
for each row execute function public.set_updated_at();

create trigger cuidado_programas_set_updated_at
before update on public.cuidado_programas
for each row execute function public.set_updated_at();

create trigger cae_cuidados_set_updated_at
before update on public.cae_cuidados
for each row execute function public.set_updated_at();

create trigger cae_cuidado_registros_set_updated_at
before update on public.cae_cuidado_registros
for each row execute function public.set_updated_at();

create trigger cuidado_itens_set_audit_metadata
before insert or update on public.cuidado_itens
for each row execute function public.set_audit_metadata();

create trigger cuidado_programas_set_audit_metadata
before insert or update on public.cuidado_programas
for each row execute function public.set_audit_metadata();

create trigger cae_cuidados_set_audit_metadata
before insert or update on public.cae_cuidados
for each row execute function public.set_audit_metadata();

create trigger cae_cuidado_registros_set_audit_metadata
before insert or update on public.cae_cuidado_registros
for each row execute function public.set_audit_metadata();

create function public.validate_care_item_deactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.active and not new.active and exists (
    select 1 from public.cuidado_programas
    where item_id = new.id and active
  ) then
    raise exception 'Desative os programas deste item antes de desativá-lo.';
  end if;
  return new;
end;
$$;

create trigger cuidado_itens_validate_deactivation
before update of active on public.cuidado_itens
for each row execute function public.validate_care_item_deactivation();

create function public.validate_care_program()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active and not exists (
    select 1 from public.cuidado_itens
    where id = new.item_id and active
  ) then
    raise exception 'O programa exige um item de cuidado ativo.';
  end if;
  return new;
end;
$$;

create trigger cuidado_programas_validate
before insert or update of item_id, active on public.cuidado_programas
for each row execute function public.validate_care_program();

create function public.prepare_dog_care_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  care_program public.cuidado_programas%rowtype;
begin
  select * into care_program
  from public.cuidado_programas
  where id = new.program_id;

  if not found or not care_program.active then
    raise exception 'A atribuição exige um programa de cuidado ativo.';
  end if;

  new.dose := coalesce(new.dose, care_program.default_dose);
  new.frequency := coalesce(new.frequency, care_program.default_frequency);
  new.start_date := coalesce(new.start_date, care_program.start_date);
  new.end_date := coalesce(new.end_date, care_program.end_date);
  new.next_due_on := coalesce(new.next_due_on, new.start_date);
  return new;
end;
$$;

create trigger cae_cuidados_prepare
before insert on public.cae_cuidados
for each row execute function public.prepare_dog_care_assignment();

create function public.protect_global_care_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.cuidado_programas
    where id = old.program_id and scope = 'todos' and active
  ) then
    raise exception 'Cuidados globais devem ser suspensos ou dispensados, não removidos.';
  end if;
  return old;
end;
$$;

create trigger cae_cuidados_protect_global_delete
before delete on public.cae_cuidados
for each row execute function public.protect_global_care_assignment();

create function public.sync_global_care_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.active and new.scope = 'todos' then
    insert into public.cae_cuidados (dog_id, program_id)
    select dog.id, new.id
    from public.caes dog
    where dog.status = 'disponivel'
    on conflict (dog_id, program_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger cuidado_programas_sync_global
after insert or update of scope, active on public.cuidado_programas
for each row execute function public.sync_global_care_program();

create function public.sync_global_care_for_dog()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'disponivel' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'disponivel' then
    return new;
  end if;

  insert into public.cae_cuidados (dog_id, program_id)
  select new.id, program.id
  from public.cuidado_programas program
  where program.scope = 'todos' and program.active
  on conflict (dog_id, program_id) do nothing;
  return new;
end;
$$;

create trigger caes_sync_global_care
after insert or update of status on public.caes
for each row execute function public.sync_global_care_for_dog();

create function public.prepare_dog_care_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  care_item public.cuidado_itens%rowtype;
  care_assignment public.cae_cuidados%rowtype;
  interval_days integer;
begin
  if tg_op = 'UPDATE' and new.assignment_id <> old.assignment_id then
    raise exception 'Um registro não pode ser movido para outro cuidado.';
  end if;

  select assignment.* into care_assignment
  from public.cae_cuidados assignment
  where assignment.id = new.assignment_id;

  select default_interval_days into interval_days
  from public.cuidado_programas
  where id = care_assignment.program_id;

  select item.* into care_item
  from public.cuidado_itens item
  join public.cuidado_programas program on program.item_id = item.id
  where program.id = care_assignment.program_id;

  if tg_op = 'INSERT' then
    new.item_name := care_item.name;
    new.item_category := care_item.category;
    new.item_presentation := care_item.presentation;
    new.dose := coalesce(new.dose, care_assignment.dose);
    if new.type = 'aplicacao'
      and new.next_due_on is null
      and interval_days is not null then
      new.next_due_on := new.occurred_at::date + interval_days;
    end if;
  else
    new.item_name := old.item_name;
    new.item_category := old.item_category;
    new.item_presentation := old.item_presentation;
  end if;
  return new;
end;
$$;

create trigger cae_cuidado_registros_prepare
before insert or update on public.cae_cuidado_registros
for each row execute function public.prepare_dog_care_record();

create function public.sync_dog_care_from_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_status public.cuidado_situacao;
  latest_record public.cae_cuidado_registros%rowtype;
begin
  select status into assignment_status
  from public.cae_cuidados
  where id = new.assignment_id;

  if assignment_status in ('suspenso', 'dispensado') then
    return new;
  end if;

  select * into latest_record
  from public.cae_cuidado_registros
  where assignment_id = new.assignment_id
    and type <> 'observacao'
  order by occurred_at desc, created_at desc, id desc
  limit 1;

  if not found then
    return new;
  end if;

  update public.cae_cuidados
  set
    next_due_on = case
      when latest_record.type = 'conclusao' then null
      else latest_record.next_due_on
    end,
    status = case latest_record.type
      when 'inicio' then 'em_andamento'::public.cuidado_situacao
      when 'conclusao' then 'concluido'::public.cuidado_situacao
      when 'aplicacao' then case
        when latest_record.next_due_on is null then 'concluido'::public.cuidado_situacao
        else 'pendente'::public.cuidado_situacao
      end
      else status
    end
  where id = new.assignment_id;
  return new;
end;
$$;

create trigger cae_cuidado_registros_sync_assignment
after insert or update on public.cae_cuidado_registros
for each row execute function public.sync_dog_care_from_records();

revoke all on function public.validate_care_item_deactivation() from public;
revoke all on function public.validate_care_program() from public;
revoke all on function public.prepare_dog_care_assignment() from public;
revoke all on function public.protect_global_care_assignment() from public;
revoke all on function public.sync_global_care_program() from public;
revoke all on function public.sync_global_care_for_dog() from public;
revoke all on function public.prepare_dog_care_record() from public;
revoke all on function public.sync_dog_care_from_records() from public;

alter table public.cuidado_itens enable row level security;
alter table public.cuidado_programas enable row level security;
alter table public.cae_cuidados enable row level security;
alter table public.cae_cuidado_registros enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'cuidado_itens',
    'cuidado_programas',
    'cae_cuidados',
    'cae_cuidado_registros'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
       using ((select public.is_admin()))
       with check ((select public.is_admin()))',
      'Admins manage ' || table_name,
      table_name
    );
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated
       using ((select auth.jwt() ->> ''aal'') = ''aal2'')
       with check ((select auth.jwt() ->> ''aal'') = ''aal2'')',
      'MFA protects ' || table_name,
      table_name
    );
  end loop;
end;
$$;

revoke all on public.cuidado_itens, public.cuidado_programas,
  public.cae_cuidados, public.cae_cuidado_registros from anon;

grant select, insert, update, delete on public.cuidado_itens,
  public.cuidado_programas, public.cae_cuidados to authenticated;
grant select, insert, update on public.cae_cuidado_registros to authenticated;
