begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(26);

select is((select count(*) from public.site_settings), 1::bigint, 'mantém uma única configuração global');
select is(
  (select adoption_form_url from public.site_settings),
  'https://forms.gle/nLSjXJyeLGUJXZj27',
  'migra o formulário de adoção para a fonte global'
);
select col_is_null('public', 'caes', 'adoption_form_url', 'mantém o link por cão como override opcional');
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size, adoption_form_url)
    values ('Override', 'Cão de teste', 2020, 'macho', 'medio', 'http://destino-inseguro.example')$$,
  '23514', null, 'rejeita override do formulário sem HTTPS'
);
select is((select count(*) from public.social_links), 2::bigint, 'materializa as redes suportadas');

select throws_ok(
  $$update public.site_settings set recurring_donation_urls = '{"10":"http://destino-inseguro.example"}' where singleton$$,
  '23514', null, 'rejeita link recorrente sem HTTPS'
);
select throws_ok(
  $$update public.site_settings set recurring_donation_urls = '{"25":"https://pagseguro.example/25"}' where singleton$$,
  '23514', null, 'rejeita valor recorrente não suportado'
);
select throws_ok(
  $$update public.site_settings set pix_receiver = 'Nome de recebedor acima do limite permitido' where singleton$$,
  '23514', null, 'respeita o limite do recebedor no Pix'
);
update public.site_settings
set pix_key = null, pix_receiver = null, pix_city = null
where singleton;
select throws_ok(
  $$update public.site_settings set pix_key = 'pix@example.com' where singleton$$,
  '23514', null, 'exige os três dados do Pix em conjunto'
);
select throws_ok(
  $$update public.social_links set url = 'javascript:alert(1)' where network = 'facebook'$$,
  '23514', null, 'rejeita protocolo inválido nas redes sociais'
);
select lives_ok(
  $$update public.site_settings set pix_key = 'pix@example.com', pix_receiver = 'Abrigo da Marcia', pix_city = 'Ribeirao Preto', recurring_donation_urls = '{"10":"https://pagseguro.example/10"}', volunteer_form_url = null where singleton$$,
  'permite ocultar CTAs opcionais sem destino'
);
select lives_ok(
  $$update public.event_settings set default_post_payment_instructions = 'Envie o comprovante.' where singleton$$,
  'persiste padrões de pagamento de novos eventos'
);

insert into auth.users (
  id, instance_id, aud, role, email, invited_at, raw_app_meta_data,
  raw_user_meta_data, created_at, updated_at
)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'convidado@example.com', null,
    '{"provider":"email"}', '{"display_name":"Márcia"}', now(), now()),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'cadastro@example.com', null,
    '{"provider":"email"}', '{}', now(), now());

update auth.users
set invited_at = now()
where email = 'convidado@example.com';

select is(
  (select raw_app_meta_data ->> 'role' from auth.users where email = 'convidado@example.com'),
  'admin',
  'atribui papel admin somente a usuário criado por convite'
);
select is(
  (select raw_app_meta_data ->> 'role' from auth.users where email = 'cadastro@example.com'),
  null::text,
  'não promove usuário sem convite'
);

update auth.users
set encrypted_password = 'senha-armazenada'
where email = 'convidado@example.com';

select is(
  (select raw_app_meta_data ->> 'admin_onboarding_completed' from auth.users where email = 'convidado@example.com'),
  'true',
  'conclui o cadastro convidado somente após definir senha'
);
select is(
  (select display_name from public.admin_profiles where user_id = '70000000-0000-0000-0000-000000000001'),
  'Márcia',
  'sincroniza o perfil antes de concluir o convite'
);
update auth.users
set raw_user_meta_data = '{"display_name":"Alteração sem MFA"}',
  encrypted_password = 'outra-senha-armazenada'
where email = 'convidado@example.com';
select is(
  (select display_name from public.admin_profiles where user_id = '70000000-0000-0000-0000-000000000001'),
  'Márcia',
  'não reutiliza o trigger de onboarding para alterar perfil depois do cadastro'
);

update auth.users set invited_at = now() where email = 'cadastro@example.com';
select lives_ok(
  $$update auth.users set encrypted_password = 'senha-sem-nome' where email = 'cadastro@example.com'$$,
  'permite a senha técnica do Auth sem concluir o convite'
);
select is(
  (select raw_app_meta_data ->> 'admin_onboarding_completed' from auth.users where email = 'cadastro@example.com'),
  null::text,
  'mantém o onboarding pendente enquanto o nome não foi informado'
);
select is(
  (select count(*) from public.admin_profiles where user_id = '70000000-0000-0000-0000-000000000002'),
  0::bigint,
  'não cria perfil parcial quando o onboarding falha'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select is((select count(*) from public.site_settings), 0::bigint, 'nega dados administrativos sem aal2');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select is((select count(*) from public.site_settings), 0::bigint, 'nega conta sem papel admin');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select is((select count(*) from public.site_settings), 1::bigint, 'autoriza admin com aal2');

set local role anon;
select has_column('public', 'caes_public', 'adoption_form_url', 'expõe o override do formulário ao catálogo público');
select is((select count(*) from public.site_settings_public), 1::bigint, 'mantém somente a view necessária disponível ao público');
select is((select recurring_donation_urls ->> '10' from public.site_settings_public), 'https://pagseguro.example/10', 'expõe o destino recorrente por valor');

select * from finish();
rollback;
