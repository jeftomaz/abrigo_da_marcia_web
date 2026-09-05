-- Serializa registros concorrentes e valida o cuidado no momento da realização.

create or replace function public.prepare_dog_care_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  initial_assignment public.cae_cuidados%rowtype;
  care_assignment public.cae_cuidados%rowtype;
  care_program public.cuidado_programas%rowtype;
  care_item public.cuidado_itens%rowtype;
  dog_status public.cae_status;
begin
  if tg_op = 'UPDATE' and new.assignment_id <> old.assignment_id then
    raise exception 'Um registro não pode ser movido para outro cuidado.';
  end if;

  select assignment.* into initial_assignment
  from public.cae_cuidados assignment
  where assignment.id = new.assignment_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'O cuidado informado não existe.';
  end if;

  select program.* into care_program
  from public.cuidado_programas program
  where program.id = initial_assignment.program_id
  for share;

  select item.* into care_item
  from public.cuidado_itens item
  where item.id = care_program.item_id
  for share;

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
      raise exception using
        errcode = '23514',
        message = 'Só é possível registrar cuidados para cães disponíveis.';
    end if;
    if not care_program.active or not care_item.active then
      raise exception using
        errcode = '23514',
        message = 'O item e o programa precisam estar ativos.';
    end if;
    if care_assignment.status in ('suspenso', 'dispensado')
      or (
        new.type in ('aplicacao', 'conclusao')
        and care_assignment.status = 'concluido'
      ) then
      raise exception using
        errcode = '23514',
        message = 'O cuidado precisa estar pendente ou em andamento.';
    end if;
    if new.occurred_at > now() + interval '5 minutes' then
      raise exception using
        errcode = '23514',
        message = 'A realização não pode ser registrada no futuro.';
    end if;

    new.item_name := care_item.name;
    new.item_category := care_item.category;
    new.item_presentation := care_item.presentation;
    new.dose := coalesce(new.dose, care_assignment.dose);
    if new.type = 'aplicacao'
      and new.next_due_on is null
      and care_program.default_interval_days is not null then
      new.next_due_on := new.occurred_at::date + care_program.default_interval_days;
    end if;
  else
    new.item_name := old.item_name;
    new.item_category := old.item_category;
    new.item_presentation := old.item_presentation;
  end if;
  return new;
end;
$$;

revoke all on function public.prepare_dog_care_record() from public;
