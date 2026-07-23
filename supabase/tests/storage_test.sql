begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);

-- O trigger de proteção do Storage recusa DELETE direto; liberá-lo aqui permite
-- exercitar a policy de exclusão sem passar pela API.
set local storage.allow_delete_query = 'true';

-- Configuração do bucket compartilhado por Cães, Histórias e Eventos
select is(
  (select public from storage.buckets where id = 'dog-photos'),
  true,
  'mantém o bucket de fotos público para leitura'
);
select is(
  (select file_size_limit from storage.buckets where id = 'dog-photos'),
  500000::bigint,
  'limita cada objeto a 500.000 bytes no servidor'
);
select is(
  (select allowed_mime_types from storage.buckets where id = 'dog-photos'),
  array['image/jpeg', 'image/png', 'image/webp'],
  'aceita somente JPG, PNG e WebP no servidor'
);

insert into storage.buckets (id, name, public) values ('bucket-alheio', 'bucket-alheio', false);

-- Acesso anônimo
set local role anon;
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos'),
  0::bigint,
  'não expõe a listagem de objetos ao anônimo'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('dog-photos', 'anon/invasao.webp')$$,
  '42501', null, 'nega ao anônimo o envio de arquivos'
);

-- Acesso administrativo sem os dois requisitos
set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('dog-photos', 'aal1/foto.webp')$$,
  '42501', null, 'nega envio a admin sem aal2'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos'),
  0::bigint,
  'nega leitura de objetos a admin sem aal2'
);

select set_config('request.jwt.claims', '{"app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('dog-photos', 'reader/foto.webp')$$,
  '42501', null, 'nega envio a conta sem papel admin'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos'),
  0::bigint,
  'nega leitura de objetos a conta sem papel admin'
);

-- Admin com aal2
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select lives_ok(
  $$insert into storage.objects (bucket_id, name) values ('dog-photos', 'caes/teste.webp')$$,
  'permite ao admin com aal2 enviar fotos ao bucket'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('bucket-alheio', 'caes/teste.webp')$$,
  '42501', null, 'restringe o admin ao bucket de fotos do abrigo'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos' and name = 'caes/teste.webp'),
  1::bigint,
  'permite ao admin com aal2 listar os objetos enviados'
);

update storage.objects set name = 'caes/renomeado.webp' where bucket_id = 'dog-photos';
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos' and name = 'caes/teste.webp'),
  1::bigint,
  'não concede atualização de objetos: renomear exige reenviar pela API'
);

select lives_ok(
  $$delete from storage.objects where bucket_id = 'dog-photos' and name = 'caes/teste.webp'$$,
  'permite ao admin com aal2 remover fotos descartadas'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'dog-photos' and name = 'caes/teste.webp'),
  0::bigint,
  'remove o objeto do bucket após a exclusão'
);

select * from finish();
rollback;
