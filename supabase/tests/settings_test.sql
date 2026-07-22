begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

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
