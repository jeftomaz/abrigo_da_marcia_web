begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(69);

delete from public.cae_cuidado_registros;
delete from public.cae_cuidados;
delete from public.cuidado_programas;
delete from public.cuidado_itens;
delete from public.caes;

select has_table('public', 'cuidado_itens', 'possui catálogo privado de itens de cuidado');
select has_table('public', 'cuidado_programas', 'possui programas de cuidado');
select has_table('public', 'cae_cuidados', 'possui atribuições individuais por cão');
select has_table('public', 'cae_cuidado_registros', 'possui histórico realizado por atribuição');
select has_type('public', 'cuidado_abrangencia', 'possui abrangência de programa');
select has_type('public', 'cuidado_situacao', 'possui situações individuais de cuidado');
select has_type('public', 'cuidado_registro_tipo', 'possui tipos de registro realizado');

select throws_ok(
  $$insert into public.cuidado_itens (name, category) values ('   ', 'Vacina')$$,
  '23514', null, 'rejeita item com nome vazio'
);

insert into public.cuidado_itens (id, name, category, presentation)
values (
  '70000000-0000-0000-0000-000000000001',
  'Vacina V10',
  'Vacina',
  '10 doses'
);
select is(
  (select updated_by_name from public.cuidado_itens
    where id = '70000000-0000-0000-0000-000000000001'),
  'Sistema', 'catálogo recebe autoria automática'
);

select throws_ok(
  $$insert into public.cuidado_itens (name, category, presentation)
    values ('vacina v10', 'VACINA', '10 DOSES')$$,
  '23505', null, 'rejeita item duplicado sem diferenciar maiúsculas'
);

insert into public.caes (id, name, description, birth_year, gender, size, status)
values
  ('70000000-0000-0000-0000-000000000101', 'Disponível', 'Cão em cuidado', 2020, 'macho', 'medio', 'disponivel'),
  ('70000000-0000-0000-0000-000000000102', 'Adotado', 'Cão fora do abrigo', 2021, 'femea', 'pequeno', 'adotado');

select lives_ok(
  $$insert into public.cuidado_programas (
      id, item_id, name, scope, default_dose, default_frequency,
      default_interval_days, start_date
    ) values (
      '70000000-0000-0000-0000-000000000201',
      '70000000-0000-0000-0000-000000000001',
      'V10 anual', 'todos', '2 mL', 'Uma vez ao ano', 365, '2026-01-10'
    )$$,
  'aceita programa global e materializa as atribuições'
);

select is(
  (select count(*) from public.cae_cuidados
    where program_id = '70000000-0000-0000-0000-000000000201'),
  1::bigint, 'programa global inclui os cães disponíveis atuais'
);
select is(
  (select count(*) from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000102'),
  0::bigint, 'programa global não cria pendência para cão adotado'
);
select is(
  (select dose from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'),
  '2 mL', 'atribuição herda a dose padrão'
);
select is(
  (select frequency from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'),
  'Uma vez ao ano', 'atribuição herda a frequência padrão'
);
select is(
  (select start_date from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'),
  '2026-01-10'::date, 'atribuição herda a data inicial'
);
select is(
  (select next_due_on from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'),
  '2026-01-10'::date, 'data inicial vira a primeira pendência'
);
select is(
  (select status from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'),
  'pendente'::public.cuidado_situacao, 'atribuição começa pendente'
);

insert into public.caes (id, name, description, birth_year, gender, size)
values ('70000000-0000-0000-0000-000000000103', 'Novo', 'Novo cão', 2022, 'macho', 'grande');
select is(
  (select count(*) from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000103'),
  1::bigint, 'novo cão disponível recebe programas globais ativos'
);

insert into public.caes (id, name, description, birth_year, gender, size, status)
values ('70000000-0000-0000-0000-000000000104', 'Já adotado', 'Registro preservado', 2019, 'femea', 'medio', 'adotado');
select is(
  (select count(*) from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000104'),
  0::bigint, 'novo cão adotado não recebe programa global'
);

update public.caes set status = 'disponivel'
where id = '70000000-0000-0000-0000-000000000104';
select is(
  (select count(*) from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000104'),
  1::bigint, 'cão que retorna ao abrigo recebe programas globais'
);

update public.caes set status = 'adotado'
where id = '70000000-0000-0000-0000-000000000103';
update public.caes set status = 'disponivel'
where id = '70000000-0000-0000-0000-000000000103';
select is(
  (select count(*) from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000103'),
  1::bigint, 'retornos repetidos não duplicam a atribuição'
);

select lives_ok(
  $$insert into public.cuidado_programas (id, item_id, name, scope)
    values (
      '70000000-0000-0000-0000-000000000202',
      '70000000-0000-0000-0000-000000000001',
      'Tratamento selecionado', 'selecionados'
    )$$,
  'aceita programa para cães selecionados'
);
select is(
  (select count(*) from public.cae_cuidados
    where program_id = '70000000-0000-0000-0000-000000000202'),
  0::bigint, 'programa selecionado não cria atribuições automáticas'
);
select lives_ok(
  $$insert into public.cae_cuidados (dog_id, program_id)
    values (
      '70000000-0000-0000-0000-000000000101',
      '70000000-0000-0000-0000-000000000202'
    )$$,
  'permite atribuir programa selecionado a um cão'
);

select throws_ok(
  $$update public.cae_cuidados set status = 'suspenso'
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000202'$$,
  '23514', null, 'exige motivo ao suspender um cuidado'
);
select lives_ok(
  $$update public.cae_cuidados
    set status = 'suspenso', exception_reason = 'Orientação veterinária'
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000202'$$,
  'aceita suspensão justificada'
);

select throws_ok(
  $$delete from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000103'
      and program_id = '70000000-0000-0000-0000-000000000201'$$,
  'P0001', 'Cuidados globais devem ser suspensos ou dispensados, não removidos.',
  'preserva atribuição de programa global'
);

select throws_ok(
  $$update public.cuidado_itens set active = false
    where id = '70000000-0000-0000-0000-000000000001'$$,
  'P0001', 'Desative os programas deste item antes de desativá-lo.',
  'impede desativar item usado por programa ativo'
);

select ok(
  position(
    'for share' in lower(pg_get_functiondef('public.validate_care_program()'::regprocedure))
  ) > 0,
  'ativação de programa compartilha a tranca do item'
);

update public.cuidado_programas set active = false
where item_id = '70000000-0000-0000-0000-000000000001';
select lives_ok(
  $$update public.cuidado_itens set active = false
    where id = '70000000-0000-0000-0000-000000000001'$$,
  'desativa item depois de desativar seus programas'
);
select throws_ok(
  $$update public.cuidado_programas set active = true
    where id = '70000000-0000-0000-0000-000000000201'$$,
  'P0001', 'O programa exige um item de cuidado ativo.',
  'não ativa programa ligado a item inativo'
);
update public.cuidado_itens set active = true
where id = '70000000-0000-0000-0000-000000000001';
select lives_ok(
  $$update public.cuidado_programas set active = true
    where id = '70000000-0000-0000-0000-000000000201'$$,
  'reativa programa depois de reativar o item'
);

insert into public.cuidado_itens (id, name, category)
values ('70000000-0000-0000-0000-000000000002', 'Vermífugo', 'Medicamento');
select lives_ok(
  $$select public.save_care_program(
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Vermifugação',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => array[
      '70000000-0000-0000-0000-000000000101'::uuid,
      '70000000-0000-0000-0000-000000000103'::uuid
    ],
    p_default_dose => '1 comprimido',
    p_default_frequency => 'Dose única',
    p_start_date => '2026-02-01'
  )$$,
  'salva programa e seleção de cães em uma transação'
);
select is(
  (select count(*) from public.cae_cuidados
    where program_id = (
      select id from public.cuidado_programas where name = 'Vermifugação'
    )),
  2::bigint, 'materializa toda a seleção do programa'
);
update public.cae_cuidados
set status = 'suspenso', exception_reason = 'Orientação veterinária'
where dog_id = '70000000-0000-0000-0000-000000000101'
  and program_id = (select id from public.cuidado_programas where name = 'Vermifugação');
select lives_ok(
  $$select public.save_care_program(
    p_program_id => (select id from public.cuidado_programas where name = 'Vermifugação'),
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Vermifugação',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => array[
      '70000000-0000-0000-0000-000000000101'::uuid,
      '70000000-0000-0000-0000-000000000103'::uuid
    ]
  )$$,
  'edita programa sem reativar cuidado suspenso individualmente'
);
select is(
  (select status from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = (select id from public.cuidado_programas where name = 'Vermifugação')),
  'suspenso'::public.cuidado_situacao,
  'preserva suspensão individual ao salvar o programa'
);
select lives_ok(
  $$select public.save_care_program(
    p_program_id => (select id from public.cuidado_programas where name = 'Vermifugação'),
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Vermifugação',
    p_scope => 'selecionados',
    p_active => false,
    p_dog_ids => array[
      '70000000-0000-0000-0000-000000000101'::uuid,
      '70000000-0000-0000-0000-000000000103'::uuid
    ]
  )$$,
  'desativa programa selecionado sem recriar suas atribuições'
);
select is(
  (select active from public.cuidado_programas where name = 'Vermifugação'),
  false, 'persiste a desativação do programa selecionado'
);
select throws_ok(
  $$select public.save_care_program(
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Sem seleção',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => '{}'::uuid[]
  )$$,
  '23514', 'Selecione ao menos um cão para o programa.',
  'rejeita programa selecionado sem cães'
);
select throws_ok(
  $$select public.save_care_program(
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Cão fora do abrigo',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => array['70000000-0000-0000-0000-000000000102'::uuid]
  )$$,
  '23514', 'Novos cuidados só podem ser atribuídos a cães disponíveis.',
  'rejeita nova atribuição para cão fora do abrigo'
);
select throws_ok(
  $$select public.save_care_program(
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Programa inválido',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => array['70000000-0000-0000-0000-000000000999'::uuid]
  )$$,
  '23503', 'A seleção contém um cão inexistente.',
  'rejeita seleção com cão inexistente'
);
select is(
  (select count(*) from public.cuidado_programas
    where name = 'Programa inválido'),
  0::bigint, 'falha da seleção não deixa programa parcial'
);
select lives_ok(
  $$select public.save_care_program(
    p_program_id => (select id from public.cuidado_programas where name = 'Vermifugação'),
    p_item_id => '70000000-0000-0000-0000-000000000002',
    p_name => 'Vermifugação',
    p_scope => 'selecionados',
    p_active => true,
    p_dog_ids => array['70000000-0000-0000-0000-000000000101'::uuid],
    p_default_dose => '1 comprimido',
    p_default_frequency => 'Dose única',
    p_start_date => '2026-02-01'
  )$$,
  'atualiza a seleção do programa na mesma transação'
);
select is(
  (select count(*) from public.cae_cuidados
    where program_id = (
      select id from public.cuidado_programas where name = 'Vermifugação'
    )),
  1::bigint, 'remove atribuição sem histórico que saiu da seleção'
);

select lives_ok(
  $$insert into public.cae_cuidado_registros (
      id, assignment_id, type, occurred_at
    ) values (
      '70000000-0000-0000-0000-000000000301',
      (select id from public.cae_cuidados
        where dog_id = '70000000-0000-0000-0000-000000000101'
          and program_id = '70000000-0000-0000-0000-000000000201'),
      'aplicacao', '2026-01-10 12:00:00+00'
    )$$,
  'registra uma aplicação realizada'
);
select is(
  (select concat_ws('|', item_name, item_category, item_presentation, dose, next_due_on::text)
    from public.cae_cuidado_registros
    where id = '70000000-0000-0000-0000-000000000301'),
  'Vacina V10|Vacina|10 doses|2 mL|2027-01-10',
  'aplicação guarda snapshots e calcula a próxima data sugerida'
);
select is(
  (select next_due_on from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000201'),
  '2027-01-10'::date, 'aplicação atualiza a próxima pendência do cão'
);
select is(
  (select status from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000201'),
  'pendente'::public.cuidado_situacao, 'programa recorrente permanece pendente'
);

select lives_ok(
  $$update public.cuidado_itens set name = 'Vacina V10 atualizada'
    where id = '70000000-0000-0000-0000-000000000001'$$,
  'permite corrigir o nome atual do item'
);
select is(
  (select item_name from public.cae_cuidado_registros
    where id = '70000000-0000-0000-0000-000000000301'),
  'Vacina V10', 'renomear catálogo não altera snapshot histórico'
);

select lives_ok(
  $$insert into public.cae_cuidado_registros (assignment_id, type, occurred_at)
    values (
      (select id from public.cae_cuidados
        where dog_id = '70000000-0000-0000-0000-000000000101'
          and program_id = '70000000-0000-0000-0000-000000000201'),
      'conclusao', '2026-01-11 12:00:00+00'
    )$$,
  'registra a conclusão de um cuidado'
);
select is(
  (select status from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000201'),
  'concluido'::public.cuidado_situacao, 'conclusão encerra a atribuição'
);
select is(
  (select next_due_on from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000201'),
  null::date, 'conclusão limpa a próxima pendência'
);

select lives_ok(
  $$insert into public.cae_cuidado_registros (assignment_id, type, occurred_at, notes)
    values (
      (select id from public.cae_cuidados
        where dog_id = '70000000-0000-0000-0000-000000000101'
          and program_id = '70000000-0000-0000-0000-000000000201'),
      'observacao', '2026-01-12 12:00:00+00', 'Sem reação adversa'
    )$$,
  'aceita observação sem alterar o ciclo'
);
select is(
  (select status from public.cae_cuidados
    where dog_id = '70000000-0000-0000-0000-000000000101'
      and program_id = '70000000-0000-0000-0000-000000000201'),
  'concluido'::public.cuidado_situacao, 'observação preserva a situação vigente'
);

select throws_ok(
  $$update public.cae_cuidado_registros
    set assignment_id = (
      select id from public.cae_cuidados
      where dog_id = '70000000-0000-0000-0000-000000000101'
        and program_id = '70000000-0000-0000-0000-000000000202'
    )
    where id = '70000000-0000-0000-0000-000000000301'$$,
  'P0001', 'Um registro não pode ser movido para outro cuidado.',
  'impede mover um registro para outra atribuição'
);
select throws_ok(
  $$delete from public.caes
    where id = '70000000-0000-0000-0000-000000000101'$$,
  '23503', null, 'preserva cão que já possui prontuário'
);

set local role anon;
select throws_ok(
  $$select 1 from public.cuidado_itens$$,
  '42501', null, 'nega leitura anônima do catálogo de cuidados'
);
select throws_ok(
  $$insert into public.cuidado_itens (name, category) values ('Invasor', 'Outro')$$,
  '42501', null, 'nega escrita anônima no catálogo de cuidados'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select is(
  (select count(*) from public.cuidado_itens),
  0::bigint, 'nega cuidados a admin sem aal2'
);

select set_config('request.jwt.claims', '{"app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select is(
  (select count(*) from public.cuidado_itens),
  0::bigint, 'nega cuidados a conta sem papel admin'
);

select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select ok(
  (select count(*) from public.cuidado_itens) > 0,
  'autoriza leitura a admin com aal2'
);
select lives_ok(
  $$insert into public.cuidado_itens (name, category) values ('Novo cuidado', 'Outro')$$,
  'autoriza criação a admin com aal2'
);
select throws_ok(
  $$delete from public.cae_cuidado_registros
    where id = '70000000-0000-0000-0000-000000000301'$$,
  '42501', null, 'não concede exclusão de registros realizados'
);

set local role postgres;
select hasnt_view('public', 'cuidado_itens_public', 'não cria catálogo público de cuidados');
select hasnt_view('public', 'cuidado_programas_public', 'não cria programas públicos de cuidados');
select ok(
  not has_function_privilege(
    'anon',
    'public.save_care_program(uuid,text,public.cuidado_abrangencia,boolean,uuid[],uuid,text,text,integer,text,date,date)',
    'execute'
  ),
  'nega a RPC de programas ao papel anônimo'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.save_care_program(uuid,text,public.cuidado_abrangencia,boolean,uuid[],uuid,text,text,integer,text,date,date)',
    'execute'
  ),
  'concede a RPC de programas somente ao papel autenticado protegido por RLS'
);

select * from finish();
rollback;
