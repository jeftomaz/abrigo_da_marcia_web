begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(37);

select has_table('public', 'admin_profiles', 'materializa os perfis administrativos privados');
select col_not_null('public', 'admin_profiles', 'display_name', 'exige nome ou apelido no perfil');
select has_column('public', 'caes', 'updated_by', 'audita cães');
select has_column('public', 'historias', 'updated_by', 'audita histórias');
select has_column('public', 'eventos', 'updated_by', 'audita eventos');
select has_column('public', 'reservas', 'updated_by', 'audita reservas');
select has_column('public', 'site_settings', 'updated_by', 'audita configurações gerais');
select has_column('public', 'event_settings', 'updated_by', 'audita configurações de eventos');
select has_column('public', 'social_links', 'updated_by', 'audita redes sociais');
select has_column('public', 'event_deletion_audit', 'deleted_by_name', 'preserva o nome de quem excluiu o evento');
select is(
  (select prosecdef from pg_proc where oid = 'public.draw_raffle_prize(uuid)'::regprocedure),
  false,
  'mantém o sorteio sob RLS do admin autenticado'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.delete_archived_event(uuid,timestamptz)'::regprocedure),
  false,
  'mantém a exclusão legada sob RLS do admin autenticado'
);

insert into auth.users (
  id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'marcia-audit@example.com', '{"role":"admin"}', '{}', now(), now()),
  ('71000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'apoio-audit@example.com', '{"role":"admin"}', '{}', now(), now());

insert into public.admin_profiles (user_id, display_name)
values ('71000000-0000-0000-0000-000000000001', 'Márcia');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select is((select count(*) from public.admin_profiles), 0::bigint, 'nega perfis a admin sem aal2');

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select is((select count(*) from public.admin_profiles), 0::bigint, 'nega perfis a conta sem papel admin');

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select is((select count(*) from public.admin_profiles), 1::bigint, 'autoriza leitura dos perfis com papel admin e aal2');

select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000002","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select lives_ok(
  $$insert into public.admin_profiles (user_id, display_name)
    values ('71000000-0000-0000-0000-000000000002', 'Equipe de apoio')$$,
  'permite ao admin criar o próprio perfil depois do TOTP'
);
update public.admin_profiles
set display_name = 'Nome indevido'
where user_id = '71000000-0000-0000-0000-000000000001';
select is(
  (select display_name from public.admin_profiles where user_id = '71000000-0000-0000-0000-000000000001'),
  'Márcia',
  'não permite alterar o perfil de outro administrador'
);

set local role anon;
select throws_ok(
  $$select 1 from public.admin_profiles$$,
  '42501', null, 'não expõe perfis ao público'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select lives_ok(
  $$insert into public.caes (
      id, name, description, birth_year, gender, size
    ) values (
      '72000000-0000-0000-0000-000000000001', 'Auditado', 'Cão para testar autoria', 2020, 'macho', 'medio'
    )$$,
  'permite criar agregado com autoria definida pelo banco'
);

set local role postgres;
select is(
  (select updated_by from public.caes where id = '72000000-0000-0000-0000-000000000001'),
  '71000000-0000-0000-0000-000000000001'::uuid,
  'registra a identidade do admin autenticado'
);
select is(
  (select updated_by_name from public.caes where id = '72000000-0000-0000-0000-000000000001'),
  'Márcia',
  'registra o snapshot nominal do admin'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}', true);
update public.caes
set name = 'Auditado novamente',
  updated_by = '71000000-0000-0000-0000-000000000002',
  updated_by_name = 'Nome forjado'
where id = '72000000-0000-0000-0000-000000000001';

set local role postgres;
select ok(
  (select updated_by = '71000000-0000-0000-0000-000000000001'
    and updated_by_name = 'Márcia'
    from public.caes where id = '72000000-0000-0000-0000-000000000001'),
  'ignora autoria enviada pelo client'
);

select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into public.historias (id, name, description, photos)
values ('73000000-0000-0000-0000-000000000001', 'Visita', 'História enviada por visitante', array['audit.webp']);
select is(
  (select updated_by_name from public.historias where id = '73000000-0000-0000-0000-000000000001'),
  'Visitante',
  'identifica alterações públicas como Visitante'
);
select is(
  (select updated_by from public.historias where id = '73000000-0000-0000-0000-000000000001'),
  null::uuid,
  'não inventa identidade para o visitante'
);

select set_config('request.jwt.claims', '{}', true);
update public.historias set description = 'Rotina automática' where id = '73000000-0000-0000-0000-000000000001';
select is(
  (select updated_by_name from public.historias where id = '73000000-0000-0000-0000-000000000001'),
  'Sistema',
  'identifica rotinas sem sessão como Sistema'
);

update public.admin_profiles
set display_name = 'Márcia atualizada'
where user_id = '71000000-0000-0000-0000-000000000001';
select is(
  (select updated_by_name from public.caes where id = '72000000-0000-0000-0000-000000000001'),
  'Márcia',
  'preserva o snapshot mesmo após renomear o perfil'
);

select set_config('request.jwt.claims', '{}', true);
update public.eventos
set status = 'encerrado'
where id = 'a1000000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.activate_event(
    p_event_id => 'a1000000-0000-0000-0000-000000000001',
    p_deleted_by => '71000000-0000-0000-0000-000000000001'
  )$$,
  'ativa evento pelo fluxo especial do backend'
);
select is(
  (select updated_by_name from public.eventos where id = 'a1000000-0000-0000-0000-000000000001'),
  'Márcia atualizada',
  'propaga o admin autenticado na ativação executada pelo backend'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select lives_ok(
  $$select * from public.draw_raffle_prize('a1100000-0000-0000-0000-000000000001')$$,
  'realiza sorteio autenticado'
);
set local role postgres;
select is(
  (select updated_by_name from public.eventos where id = 'a1000000-0000-0000-0000-000000000001'),
  'Márcia atualizada',
  'propaga a autoria do sorteio ao agregado do evento'
);

select set_config('request.jwt.claims', '{"role":"anon"}', true);
update public.reservas
set expires_at = now() - interval '1 minute'
where session_id = 'a1200000-0000-0000-0000-000000000001';
select lives_ok(
  $$select public.expire_reservations_for_event('a1000000-0000-0000-0000-000000000001')$$,
  'executa a expiração automática no caminho público'
);
select is(
  (select updated_by_name from public.reservas where session_id = 'a1200000-0000-0000-0000-000000000001'),
  'Sistema',
  'atribui a expiração automática ao Sistema, não ao visitante que acionou a RPC'
);

select hasnt_column('public', 'caes_public', 'updated_by', 'não expõe autoria de cães ao público');
select hasnt_column('public', 'historias_public', 'updated_by', 'não expõe autoria de histórias ao público');
select hasnt_column('public', 'eventos_public', 'updated_by', 'não expõe autoria de eventos ao público');
select hasnt_column('public', 'site_settings_public', 'updated_by', 'não expõe autoria das configurações ao público');
select hasnt_column('public', 'social_links_public', 'updated_by', 'não expõe autoria das redes ao público');

select * from finish();
rollback;
