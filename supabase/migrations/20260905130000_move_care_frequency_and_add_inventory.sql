-- Move a recorrência para o item e controla estoque por aplicações registradas.

create type public.cuidado_intervalo_unidade as enum (
  'hora',
  'dia',
  'semana',
  'mes',
  'ano'
);

create type public.cuidado_estoque_origem as enum (
  'cadastro',
  'ajuste_manual',
  'aplicacao'
);

create table public.cuidado_frequencias (
  id uuid primary key default gen_random_uuid(),
  interval_count integer not null check (interval_count between 1 and 10000),
  interval_unit public.cuidado_intervalo_unidade not null,
  predefined boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema',
  unique (interval_count, interval_unit),
  check (not predefined or (interval_count = 1 and active))
);

create function public.protect_predefined_care_frequency()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.predefined then
      raise exception using errcode = '42501', message = 'Frequências preestabelecidas não podem ser alteradas.';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.predefined then
      raise exception using errcode = '42501', message = 'Somente a migration pode criar frequências preestabelecidas.';
    end if;
    return new;
  end if;
  if (
    old.predefined and (
      new.interval_count is distinct from old.interval_count
      or new.interval_unit is distinct from old.interval_unit
      or new.active is distinct from old.active
      or new.predefined is distinct from old.predefined
    )
  ) or (not old.predefined and new.predefined) then
    raise exception using errcode = '42501', message = 'Frequências preestabelecidas não podem ser alteradas.';
  end if;
  return new;
end;
$$;

create trigger cuidado_frequencias_set_updated_at
before update on public.cuidado_frequencias
for each row execute function public.set_updated_at();

create trigger cuidado_frequencias_set_audit_metadata
before insert or update on public.cuidado_frequencias
for each row execute function public.set_audit_metadata();

insert into public.cuidado_frequencias (id, interval_count, interval_unit, predefined)
values
  ('71000000-0000-0000-0000-000000000001', 1, 'hora', true),
  ('71000000-0000-0000-0000-000000000002', 1, 'dia', true),
  ('71000000-0000-0000-0000-000000000003', 1, 'semana', true),
  ('71000000-0000-0000-0000-000000000004', 1, 'mes', true),
  ('71000000-0000-0000-0000-000000000005', 1, 'ano', true);

create trigger cuidado_frequencias_protect_predefined
before insert or update or delete on public.cuidado_frequencias
for each row execute function public.protect_predefined_care_frequency();

alter table public.cuidado_itens
  add column frequency_id uuid references public.cuidado_frequencias(id) on delete restrict,
  add column stock_quantity numeric(12, 3) check (stock_quantity >= 0);

alter table public.cae_cuidados
  rename column next_due_on to next_due_at;
alter table public.cae_cuidados
  alter column next_due_at type timestamptz
  using next_due_at::timestamp at time zone 'America/Sao_Paulo';
alter table public.cae_cuidado_registros
  rename column next_due_on to next_due_at;
alter table public.cae_cuidado_registros
  alter column next_due_at type timestamptz
  using next_due_at::timestamp at time zone 'America/Sao_Paulo';
alter table public.cae_cuidado_registros
  add column item_frequency text,
  add column stock_quantity_used numeric(12, 3) check (stock_quantity_used > 0);

create table public.cuidado_estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.cuidado_itens(id) on delete restrict,
  record_id uuid references public.cae_cuidado_registros(id) on delete restrict,
  source public.cuidado_estoque_origem not null,
  previous_quantity numeric(12, 3),
  new_quantity numeric(12, 3),
  reason text check (
    reason is null or (
      reason = btrim(reason) and char_length(reason) between 1 and 500
    )
  ),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  updated_by_name text not null default 'Sistema',
  check (previous_quantity is distinct from new_quantity),
  check (source <> 'ajuste_manual' or reason is not null),
  check (source <> 'aplicacao' or record_id is not null)
);

create index cuidado_estoque_movimentos_item_timeline_idx
  on public.cuidado_estoque_movimentos (item_id, created_at desc);

create trigger cuidado_estoque_movimentos_set_audit_metadata
before insert on public.cuidado_estoque_movimentos
for each row execute function public.set_audit_metadata();

create function public.calculate_care_next_due(
  p_occurred_at timestamptz,
  p_frequency_id uuid
)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (
    p_occurred_at at time zone 'America/Sao_Paulo'
    + case frequency.interval_unit
      when 'hora' then make_interval(
        hours => frequency.interval_count
      )
      when 'dia' then make_interval(
        days => frequency.interval_count
      )
      when 'semana' then make_interval(
        weeks => frequency.interval_count
      )
      when 'mes' then make_interval(
        months => frequency.interval_count
      )
      when 'ano' then make_interval(
        years => frequency.interval_count
      )
    end
  ) at time zone 'America/Sao_Paulo'
  from public.cuidado_frequencias frequency
  where frequency.id = p_frequency_id;
$$;

drop function public.save_care_program(
  uuid, text, public.cuidado_abrangencia, boolean, uuid[], uuid,
  text, text, integer, text, date, date
);

create function public.save_care_program(
  p_item_id uuid,
  p_name text,
  p_scope public.cuidado_abrangencia,
  p_active boolean,
  p_dog_ids uuid[],
  p_program_id uuid default null,
  p_default_dose text default null,
  p_instructions text default null,
  p_start_date date default null,
  p_end_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dog_ids uuid[];
  saved_program_id uuid := coalesce(p_program_id, gen_random_uuid());
begin
  select coalesce(array_agg(distinct selected_id), '{}'::uuid[])
  into dog_ids
  from unnest(coalesce(p_dog_ids, '{}'::uuid[])) selected_id;

  if p_scope = 'todos' and cardinality(dog_ids) > 0 then
    raise exception using
      errcode = '23514',
      message = 'Programas para todos não aceitam uma seleção de cães.';
  end if;

  if p_scope = 'selecionados' and cardinality(dog_ids) = 0 then
    raise exception using
      errcode = '23514',
      message = 'Selecione ao menos um cão para o programa.';
  end if;

  if p_scope = 'selecionados' and exists (
    select 1
    from unnest(dog_ids) selected_id
    left join public.caes dog on dog.id = selected_id
    where dog.id is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'A seleção contém um cão inexistente.';
  end if;

  if p_scope = 'selecionados' and exists (
    select 1
    from unnest(dog_ids) selected_id
    join public.caes dog on dog.id = selected_id
    where dog.status <> 'disponivel'
      and not exists (
        select 1 from public.cae_cuidados assignment
        where assignment.program_id = saved_program_id
          and assignment.dog_id = selected_id
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Novos cuidados só podem ser atribuídos a cães disponíveis.';
  end if;

  if p_program_id is null then
    insert into public.cuidado_programas (
      id, item_id, name, scope, default_dose, instructions,
      start_date, end_date, active
    ) values (
      saved_program_id, p_item_id, p_name, p_scope, p_default_dose,
      p_instructions, p_start_date, p_end_date, p_active
    );
  else
    update public.cuidado_programas
    set
      item_id = p_item_id,
      name = p_name,
      scope = p_scope,
      default_dose = p_default_dose,
      instructions = p_instructions,
      start_date = p_start_date,
      end_date = p_end_date,
      active = p_active
    where id = saved_program_id;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Programa de cuidado não encontrado.';
    end if;
  end if;

  if p_scope = 'selecionados' then
    if p_active then
      update public.cae_cuidados assignment
      set status = 'pendente', exception_reason = null
      where assignment.program_id = saved_program_id
        and assignment.dog_id = any(dog_ids)
        and assignment.status = 'dispensado';

      insert into public.cae_cuidados (dog_id, program_id)
      select selected_id, saved_program_id
      from unnest(dog_ids) selected_id
      where not exists (
        select 1 from public.cae_cuidados assignment
        where assignment.program_id = saved_program_id
          and assignment.dog_id = selected_id
      );
    elsif exists (
      select 1 from unnest(dog_ids) selected_id
      where not exists (
        select 1 from public.cae_cuidados assignment
        where assignment.program_id = saved_program_id
          and assignment.dog_id = selected_id
      )
    ) then
      raise exception using
        errcode = '23514',
        message = 'Ative o programa antes de incluir novos cães.';
    end if;

    delete from public.cae_cuidados assignment
    where assignment.program_id = saved_program_id
      and not (assignment.dog_id = any(dog_ids))
      and not exists (
        select 1 from public.cae_cuidado_registros record
        where record.assignment_id = assignment.id
      );

    update public.cae_cuidados assignment
    set
      status = 'dispensado',
      exception_reason = 'Removido do programa.'
    where assignment.program_id = saved_program_id
      and not (assignment.dog_id = any(dog_ids))
      and exists (
        select 1 from public.cae_cuidado_registros record
        where record.assignment_id = assignment.id
      );
  elsif p_active then
    update public.cae_cuidados assignment
    set status = 'pendente', exception_reason = null
    from public.caes dog
    where assignment.program_id = saved_program_id
      and assignment.dog_id = dog.id
      and dog.status = 'disponivel'
      and assignment.status = 'dispensado'
      and assignment.exception_reason = 'Removido do programa.';
  end if;

  return saved_program_id;
end;
$$;

create function public.save_care_frequencies(p_frequencies jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  frequency jsonb;
  frequency_id uuid;
begin
  if p_frequencies is null
    or jsonb_typeof(p_frequencies) <> 'array'
    or jsonb_array_length(p_frequencies) > 45 then
    raise exception using
      errcode = '23514',
      message = 'Informe no máximo 45 frequências personalizadas.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_frequencies) entry
    where nullif(entry ->> 'id', '') is not null
    group by entry ->> 'id'
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'A lista contém uma frequência repetida.';
  end if;

  for frequency in select value from jsonb_array_elements(p_frequencies)
  loop
    frequency_id := nullif(frequency ->> 'id', '')::uuid;
    if frequency_id is null then
      insert into public.cuidado_frequencias (
        interval_count, interval_unit, active
      ) values (
        (frequency ->> 'intervalCount')::integer,
        (frequency ->> 'intervalUnit')::public.cuidado_intervalo_unidade,
        (frequency ->> 'active')::boolean
      );
    else
      update public.cuidado_frequencias
      set
        interval_count = (frequency ->> 'intervalCount')::integer,
        interval_unit = (frequency ->> 'intervalUnit')::public.cuidado_intervalo_unidade,
        active = (frequency ->> 'active')::boolean
      where id = frequency_id and not predefined;

      if not found then
        if exists (
          select 1 from public.cuidado_frequencias where id = frequency_id and predefined
        ) then
          raise exception using
            errcode = '42501',
            message = 'Frequências preestabelecidas não podem ser alteradas.';
        end if;
        raise exception using
          errcode = 'P0002',
          message = 'Frequência de cuidado não encontrada.';
      end if;
    end if;
  end loop;
end;
$$;

create function public.save_care_item(
  p_name text,
  p_category text,
  p_active boolean,
  p_frequency_id uuid default null,
  p_stock_quantity numeric default null,
  p_notes text default null,
  p_item_id uuid default null,
  p_expected_updated_at timestamptz default null,
  p_stock_adjustment_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_item public.cuidado_itens%rowtype;
  frequency_is_active boolean;
  saved_item_id uuid := coalesce(p_item_id, gen_random_uuid());
  stock_changed boolean;
begin
  if not (select public.is_admin())
    or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'Acesso administrativo com MFA obrigatório.';
  end if;

  if p_item_id is not null then
    select item.* into current_item
    from public.cuidado_itens item
    where item.id = p_item_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'Item de cuidado não encontrado.';
    end if;
    if p_expected_updated_at is null or current_item.updated_at <> p_expected_updated_at then
      raise exception using
        errcode = '40001',
        message = 'O item foi alterado por outra operação. Reabra o cadastro e tente novamente.';
    end if;
  end if;

  if p_frequency_id is not null and (
    p_item_id is null
    or p_frequency_id is distinct from current_item.frequency_id
  ) then
    select frequency.active into frequency_is_active
    from public.cuidado_frequencias frequency
    where frequency.id = p_frequency_id
    for share;

    if not found or not frequency_is_active then
      raise exception using
        errcode = '23514',
        message = 'Selecione uma frequência ativa.';
    end if;
  end if;

  if p_item_id is null then
    insert into public.cuidado_itens (
      id, name, category, frequency_id, stock_quantity, notes, active
    ) values (
      saved_item_id, p_name, p_category, p_frequency_id, p_stock_quantity,
      p_notes, p_active
    );

    if p_stock_quantity is not null then
      insert into public.cuidado_estoque_movimentos (
        item_id, source, previous_quantity, new_quantity
      ) values (
        saved_item_id, 'cadastro', null, p_stock_quantity
      );
    end if;
  else
    stock_changed := p_stock_quantity is distinct from current_item.stock_quantity;
    if stock_changed and (
      p_stock_adjustment_reason is null
      or btrim(p_stock_adjustment_reason) = ''
    ) then
      raise exception using
        errcode = '23514',
        message = 'Informe o motivo do ajuste manual de estoque.';
    end if;

    update public.cuidado_itens
    set
      name = p_name,
      category = p_category,
      frequency_id = p_frequency_id,
      stock_quantity = p_stock_quantity,
      notes = p_notes,
      active = p_active
    where id = saved_item_id;

    if stock_changed then
      insert into public.cuidado_estoque_movimentos (
        item_id, source, previous_quantity, new_quantity, reason
      ) values (
        saved_item_id, 'ajuste_manual', current_item.stock_quantity,
        p_stock_quantity, btrim(p_stock_adjustment_reason)
      );
    end if;
  end if;

  return saved_item_id;
end;
$$;

create function public.set_care_item_active(
  p_item_id uuid,
  p_active boolean,
  p_expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_updated_at timestamptz;
begin
  if not (select public.is_admin())
    or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'Acesso administrativo com MFA obrigatório.';
  end if;

  select item.updated_at into current_updated_at
  from public.cuidado_itens item
  where item.id = p_item_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Item de cuidado não encontrado.';
  end if;
  if current_updated_at <> p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'O item foi alterado por outra operação. Atualize a lista e tente novamente.';
  end if;

  update public.cuidado_itens set active = p_active where id = p_item_id;
end;
$$;

create or replace function public.prepare_dog_care_assignment()
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
  new.start_date := coalesce(new.start_date, care_program.start_date);
  new.end_date := coalesce(new.end_date, care_program.end_date);
  new.next_due_at := coalesce(
    new.next_due_at,
    new.start_date::timestamp at time zone 'America/Sao_Paulo'
  );
  return new;
end;
$$;

create or replace function public.prepare_dog_care_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  initial_assignment public.cae_cuidados%rowtype;
  care_assignment public.cae_cuidados%rowtype;
  care_program public.cuidado_programas%rowtype;
  care_item public.cuidado_itens%rowtype;
  care_frequency public.cuidado_frequencias%rowtype;
  dog_status public.cae_status;
begin
  if tg_op = 'UPDATE' and new.assignment_id <> old.assignment_id then
    raise exception 'Um registro não pode ser movido para outro cuidado.';
  end if;

  select assignment.* into initial_assignment
  from public.cae_cuidados assignment
  where assignment.id = new.assignment_id;

  if not found then
    raise exception using errcode = '23503', message = 'O cuidado informado não existe.';
  end if;

  select program.* into care_program
  from public.cuidado_programas program
  where program.id = initial_assignment.program_id
  for share;

  select item.* into care_item
  from public.cuidado_itens item
  where item.id = care_program.item_id
  for update;

  if care_item.frequency_id is not null then
    select frequency.* into care_frequency
    from public.cuidado_frequencias frequency
    where frequency.id = care_item.frequency_id;
  end if;

  select dog.status into dog_status
  from public.caes dog
  where dog.id = initial_assignment.dog_id
  for share;

  select assignment.* into care_assignment
  from public.cae_cuidados assignment
  where assignment.id = new.assignment_id
  for update;

  if care_assignment.program_id <> care_program.id
    or care_assignment.dog_id <> initial_assignment.dog_id then
    raise exception using
      errcode = '40001',
      message = 'O cuidado foi alterado durante o registro. Tente novamente.';
  end if;

  if tg_op = 'INSERT' then
    if dog_status <> 'disponivel' then
      raise exception using errcode = '23514', message = 'Só é possível registrar cuidados para cães disponíveis.';
    end if;
    if not care_program.active or not care_item.active then
      raise exception using errcode = '23514', message = 'O item e o programa precisam estar ativos.';
    end if;
    if care_assignment.status in ('suspenso', 'dispensado')
      or (
        new.type in ('aplicacao', 'conclusao')
        and care_assignment.status = 'concluido'
      ) then
      raise exception using errcode = '23514', message = 'O cuidado precisa estar pendente ou em andamento.';
    end if;
    if new.occurred_at > now() + interval '5 minutes' then
      raise exception using errcode = '23514', message = 'A realização não pode ser registrada no futuro.';
    end if;

    new.item_name := care_item.name;
    new.item_category := care_item.category;
    new.item_frequency := case
      when care_item.frequency_id is null then care_program.default_frequency
      else concat(
        'A cada ', care_frequency.interval_count, ' ',
        case care_frequency.interval_unit
          when 'hora' then case when care_frequency.interval_count = 1 then 'hora' else 'horas' end
          when 'dia' then case when care_frequency.interval_count = 1 then 'dia' else 'dias' end
          when 'semana' then case when care_frequency.interval_count = 1 then 'semana' else 'semanas' end
          when 'mes' then case when care_frequency.interval_count = 1 then 'mês' else 'meses' end
          when 'ano' then case when care_frequency.interval_count = 1 then 'ano' else 'anos' end
        end
      )
    end;
    new.dose := coalesce(new.dose, care_assignment.dose);
    if new.type = 'aplicacao' and new.next_due_at is null then
      if care_item.frequency_id is not null then
        new.next_due_at := public.calculate_care_next_due(
          new.occurred_at, care_item.frequency_id
        );
      elsif care_program.default_interval_days is not null then
        new.next_due_at := (
          new.occurred_at at time zone 'America/Sao_Paulo'
          + make_interval(days => care_program.default_interval_days)
        ) at time zone 'America/Sao_Paulo';
      end if;
    end if;
  else
    new.item_name := old.item_name;
    new.item_category := old.item_category;
    new.item_presentation := old.item_presentation;
    new.item_frequency := old.item_frequency;
  end if;

  if new.type = 'aplicacao' and care_item.stock_quantity is not null then
    new.stock_quantity_used := coalesce(new.stock_quantity_used, 1);
  elsif new.type = 'aplicacao'
    and tg_op = 'UPDATE'
    and old.stock_quantity_used is not null then
    if new.stock_quantity_used is distinct from old.stock_quantity_used
      or new.type is distinct from old.type then
      raise exception using
        errcode = '23514',
        message = 'Ative o controle de estoque antes de corrigir a quantidade consumida.';
    end if;
  elsif new.stock_quantity_used is not null then
    raise exception using
      errcode = '23514',
      message = 'A quantidade consumida só se aplica a itens com estoque controlado.';
  end if;

  return new;
end;
$$;

create function public.sync_care_item_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_id uuid;
  current_stock numeric(12, 3);
  next_stock numeric(12, 3);
  old_usage numeric(12, 3) := 0;
  new_usage numeric(12, 3) := 0;
begin
  if tg_op = 'UPDATE' and old.type = 'aplicacao' then
    old_usage := coalesce(old.stock_quantity_used, 0);
  end if;
  if new.type = 'aplicacao' then
    new_usage := coalesce(new.stock_quantity_used, 0);
  end if;
  if old_usage = new_usage then
    return new;
  end if;

  select program.item_id into item_id
  from public.cae_cuidados assignment
  join public.cuidado_programas program on program.id = assignment.program_id
  where assignment.id = new.assignment_id;

  select item.stock_quantity into current_stock
  from public.cuidado_itens item
  where item.id = item_id
  for update;

  if current_stock is null then
    raise exception using
      errcode = '23514',
      message = 'O item não possui controle de estoque ativo.';
  end if;

  next_stock := current_stock + old_usage - new_usage;
  if next_stock < 0 then
    raise exception using
      errcode = '23514',
      message = 'Estoque insuficiente para registrar a aplicação.';
  end if;

  update public.cuidado_itens
  set stock_quantity = next_stock
  where id = item_id;

  insert into public.cuidado_estoque_movimentos (
    item_id, record_id, source, previous_quantity, new_quantity
  ) values (
    item_id, new.id, 'aplicacao', current_stock, next_stock
  );
  return new;
end;
$$;

create trigger cae_cuidado_registros_sync_stock
after insert or update of type, stock_quantity_used
on public.cae_cuidado_registros
for each row execute function public.sync_care_item_stock();

create or replace function public.sync_dog_care_from_records()
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
    next_due_at = case
      when latest_record.type = 'conclusao' then null
      else latest_record.next_due_at
    end,
    status = case latest_record.type
      when 'inicio' then 'em_andamento'::public.cuidado_situacao
      when 'conclusao' then 'concluido'::public.cuidado_situacao
      when 'aplicacao' then case
        when latest_record.next_due_at is null then 'concluido'::public.cuidado_situacao
        else 'pendente'::public.cuidado_situacao
      end
      else status
    end
  where id = new.assignment_id;
  return new;
end;
$$;

revoke all on function public.calculate_care_next_due(timestamptz, uuid) from public;
revoke all on function public.save_care_program(
  uuid, text, public.cuidado_abrangencia, boolean, uuid[], uuid,
  text, text, date, date
) from public, anon;
revoke all on function public.save_care_frequencies(jsonb) from public, anon;
revoke all on function public.save_care_item(
  text, text, boolean, uuid, numeric, text, uuid, timestamptz, text
) from public, anon;
revoke all on function public.set_care_item_active(uuid, boolean, timestamptz) from public, anon;
revoke all on function public.protect_predefined_care_frequency() from public;
revoke all on function public.sync_care_item_stock() from public;

grant execute on function public.save_care_program(
  uuid, text, public.cuidado_abrangencia, boolean, uuid[], uuid,
  text, text, date, date
) to authenticated;
grant execute on function public.save_care_frequencies(jsonb) to authenticated;
grant execute on function public.save_care_item(
  text, text, boolean, uuid, numeric, text, uuid, timestamptz, text
) to authenticated;
grant execute on function public.set_care_item_active(uuid, boolean, timestamptz) to authenticated;

alter table public.cuidado_frequencias enable row level security;
alter table public.cuidado_estoque_movimentos enable row level security;

create policy "Admins manage cuidado_frequencias"
on public.cuidado_frequencias for all to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "MFA protects cuidado_frequencias"
on public.cuidado_frequencias as restrictive for all to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2')
with check ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Admins read cuidado_estoque_movimentos"
on public.cuidado_estoque_movimentos for select to authenticated
using ((select public.is_admin()));
create policy "MFA protects cuidado_estoque_movimentos"
on public.cuidado_estoque_movimentos as restrictive for select to authenticated
using ((select auth.jwt() ->> 'aal') = 'aal2');

revoke all on public.cuidado_frequencias, public.cuidado_estoque_movimentos from anon;
grant select, insert, update on public.cuidado_frequencias to authenticated;
grant select on public.cuidado_estoque_movimentos to authenticated;

revoke insert, update, delete on public.cuidado_itens from authenticated;
