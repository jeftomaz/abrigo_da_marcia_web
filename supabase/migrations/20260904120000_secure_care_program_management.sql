-- Serializa item/programa e salva a abrangência selecionada em uma transação.

create or replace function public.validate_care_program()
returns trigger
language plpgsql
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

create function public.save_care_program(
  p_item_id uuid,
  p_name text,
  p_scope public.cuidado_abrangencia,
  p_active boolean,
  p_dog_ids uuid[],
  p_program_id uuid default null,
  p_default_dose text default null,
  p_default_frequency text default null,
  p_default_interval_days integer default null,
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
      id, item_id, name, scope, default_dose, default_frequency,
      default_interval_days, instructions, start_date, end_date, active
    ) values (
      saved_program_id, p_item_id, p_name, p_scope, p_default_dose,
      p_default_frequency, p_default_interval_days, p_instructions,
      p_start_date, p_end_date, p_active
    );
  else
    update public.cuidado_programas
    set
      item_id = p_item_id,
      name = p_name,
      scope = p_scope,
      default_dose = p_default_dose,
      default_frequency = p_default_frequency,
      default_interval_days = p_default_interval_days,
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

revoke all on function public.save_care_program(
  uuid, text, public.cuidado_abrangencia, boolean, uuid[], uuid,
  text, text, integer, text, date, date
) from public, anon;
grant execute on function public.save_care_program(
  uuid, text, public.cuidado_abrangencia, boolean, uuid[], uuid,
  text, text, integer, text, date, date
) to authenticated;
