begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);

select is((select count(*) from public.site_settings), 1::bigint, 'mantém uma única configuração global');
select is(
  (select adoption_form_url from public.site_settings),
  'https://forms.gle/nLSjXJyeLGUJXZj27',
  'migra o formulário de adoção para a fonte global'
);
select hasnt_column('public', 'caes', 'adoption_form_url', 'remove a duplicação do link por cão');
select is((select count(*) from public.social_links), 2::bigint, 'materializa as redes suportadas');

select throws_ok(
  $$update public.site_settings set donation_url = 'http://destino-inseguro.example' where singleton$$,
  '23514', null, 'rejeita link público sem HTTPS'
);
select throws_ok(
  $$update public.social_links set url = 'javascript:alert(1)' where network = 'facebook'$$,
  '23514', null, 'rejeita protocolo inválido nas redes sociais'
);
select lives_ok(
  $$update public.site_settings set donation_url = null, volunteer_form_url = null where singleton$$,
  'permite ocultar CTAs opcionais sem destino'
);
select lives_ok(
  $$update public.event_settings set default_pix_key = 'pix@example.com', default_pix_receiver = 'Abrigo da Márcia', default_pix_city = 'Ribeirão Preto', default_pix_copy_paste = 'PIX-TESTE', default_post_payment_instructions = 'Envie o comprovante.' where singleton$$,
  'persiste padrões de pagamento de novos eventos'
);

create temporary table invited_admin_fixture (
  email text primary key,
  invited_at timestamptz,
  raw_app_meta_data jsonb,
  encrypted_password text
);

create trigger assign_invited_admin_role_fixture
before insert on invited_admin_fixture
for each row
execute function public.assign_invited_admin_role();

create trigger assign_invited_admin_role_on_invite_fixture
before update of invited_at on invited_admin_fixture
for each row
when (old.invited_at is null and new.invited_at is not null)
execute function public.assign_invited_admin_role();

create trigger complete_invited_admin_onboarding_fixture
before update of encrypted_password on invited_admin_fixture
for each row
when (
  old.invited_at is not null
  and old.encrypted_password is distinct from new.encrypted_password
)
execute function public.complete_invited_admin_onboarding();

insert into invited_admin_fixture (email, invited_at, raw_app_meta_data)
values
  ('convidado@example.com', null, '{"provider":"email"}'),
  ('cadastro@example.com', null, '{"provider":"email"}');

update invited_admin_fixture
set invited_at = now()
where email = 'convidado@example.com';

select is(
  (select raw_app_meta_data ->> 'role' from invited_admin_fixture where email = 'convidado@example.com'),
  'admin',
  'atribui papel admin somente a usuário criado por convite'
);
select is(
  (select raw_app_meta_data ->> 'role' from invited_admin_fixture where email = 'cadastro@example.com'),
  null::text,
  'não promove usuário sem convite'
);

update invited_admin_fixture
set encrypted_password = 'senha-armazenada'
where email = 'convidado@example.com';

select is(
  (select raw_app_meta_data ->> 'admin_onboarding_completed' from invited_admin_fixture where email = 'convidado@example.com'),
  'true',
  'conclui o cadastro convidado somente após definir senha'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select is((select count(*) from public.site_settings), 0::bigint, 'nega dados administrativos sem aal2');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select is((select count(*) from public.site_settings), 0::bigint, 'nega conta sem papel admin');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select is((select count(*) from public.site_settings), 1::bigint, 'autoriza admin com aal2');

set local role anon;
select is((select count(*) from public.site_settings_public), 1::bigint, 'mantém somente a view necessária disponível ao público');

select * from finish();
rollback;
