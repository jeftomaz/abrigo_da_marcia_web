begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(41);

-- Isola o catálogo dos registros fictícios do seed; o rollback final os devolve.
delete from public.historias;
delete from public.caes;

-- Integridade de caes
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('   ', 'Cão de teste', 2020, 'macho', 'medio')$$,
  '23514', null, 'rejeita nome composto apenas por espaços'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values (repeat('a', 41), 'Cão de teste', 2020, 'macho', 'medio')$$,
  '23514', null, 'rejeita nome acima de 40 caracteres'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('Rex', '   ', 2020, 'macho', 'medio')$$,
  '23514', null, 'rejeita descrição composta apenas por espaços'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('Rex', repeat('a', 1001), 2020, 'macho', 'medio')$$,
  '23514', null, 'rejeita descrição acima de 1000 caracteres'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size, photos)
    values ('Rex', 'Cão de teste', 2020, 'macho', 'medio', array['1','2','3','4','5','6'])$$,
  '23514', null, 'rejeita mais de cinco fotos por cão'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('Rex', 'Cão de teste', 1989, 'macho', 'medio')$$,
  '23514', null, 'rejeita ano de nascimento anterior a 1990'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('Rex', 'Cão de teste', 2101, 'macho', 'medio')$$,
  '23514', null, 'rejeita ano de nascimento posterior a 2100'
);
select lives_ok(
  $$insert into public.caes (id, name, description, birth_year, gender, size)
    values ('50000000-0000-0000-0000-000000000001', 'Sem Foto', 'Aguarda ensaio fotográfico', 2021, 'femea', 'pequeno')$$,
  'permite cadastrar cão sem nenhuma foto'
);
select is(
  (select status from public.caes where id = '50000000-0000-0000-0000-000000000001'),
  'disponivel'::public.cae_status,
  'assume disponível como status inicial'
);
select is(
  (select featured from public.caes where id = '50000000-0000-0000-0000-000000000001'),
  false,
  'não destaca o cão no catálogo por padrão'
);

update public.caes
set name = 'Sem Foto Ainda', updated_at = '2000-01-01T00:00:00Z'
where id = '50000000-0000-0000-0000-000000000001';
select is(
  (select updated_at from public.caes where id = '50000000-0000-0000-0000-000000000001'),
  now(),
  'deixa o trigger definir updated_at, ignorando o valor enviado pelo client'
);

-- Integridade de historias
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values ('   ', 'História de teste', array['h1.webp'])$$,
  '23514', null, 'rejeita nome de história composto apenas por espaços'
);
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values (repeat('a', 41), 'História de teste', array['h1.webp'])$$,
  '23514', null, 'rejeita nome de história acima de 40 caracteres'
);
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values ('Luna', '   ', array['h1.webp'])$$,
  '23514', null, 'rejeita descrição de história composta apenas por espaços'
);
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values ('Luna', repeat('a', 1001), array['h1.webp'])$$,
  '23514', null, 'rejeita descrição de história acima de 1000 caracteres'
);
select throws_ok(
  $$insert into public.historias (name, description)
    values ('Luna', 'História de teste')$$,
  '23514', null, 'exige ao menos uma foto na história'
);
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values ('Luna', 'História de teste', array['1','2','3','4','5','6'])$$,
  '23514', null, 'rejeita mais de cinco fotos por história'
);
select lives_ok(
  $$insert into public.historias (id, name, description, photos)
    values ('60000000-0000-0000-0000-000000000001', 'Luna', 'Adotada em 2024', array['h1.webp'])$$,
  'aceita história com uma única foto'
);
select is(
  (select published from public.historias where id = '60000000-0000-0000-0000-000000000001'),
  false,
  'cria a história como rascunho'
);

-- Views públicas: filtragem e superfície exposta
insert into public.caes (id, name, description, birth_year, gender, size, status, featured)
values
  ('50000000-0000-0000-0000-000000000002', 'Destaque', 'Cão em destaque', 2019, 'macho', 'grande', 'disponivel', true),
  ('50000000-0000-0000-0000-000000000003', 'Adotado', 'Já tem lar', 2018, 'femea', 'medio', 'adotado', false),
  ('50000000-0000-0000-0000-000000000004', 'Falecido', 'Registro preservado', 2015, 'macho', 'pequeno', 'falecido', false);

select is(
  (select count(*) from public.caes_public),
  2::bigint,
  'expõe apenas cães disponíveis no catálogo público'
);
select is(
  (select count(*) from public.caes_public where name in ('Adotado', 'Falecido')),
  0::bigint,
  'remove adotados e falecidos do catálogo público'
);
select is(
  (select name from public.caes_public limit 1),
  'Destaque',
  'ordena os cães destacados à frente no catálogo público'
);
select hasnt_column('public', 'caes_public', 'status', 'não revela o status interno do cão ao público');
select hasnt_column('public', 'caes_public', 'created_at', 'não revela a data de cadastro do cão ao público');

update public.historias set published = true where id = '60000000-0000-0000-0000-000000000001';
insert into public.historias (id, name, description, photos, published)
values ('60000000-0000-0000-0000-000000000002', 'Thor', 'Ainda em revisão', array['h2.webp'], false);

select is(
  (select count(*) from public.historias_public),
  1::bigint,
  'expõe somente histórias publicadas'
);
select is(
  (select name from public.historias_public),
  'Luna',
  'mantém o rascunho de história fora da view pública'
);
select hasnt_column('public', 'historias_public', 'published', 'não revela o controle de publicação ao público');

select is(
  (select count(*) from public.social_links_public),
  (select count(*) from public.social_links where url is not null),
  'expõe apenas as redes sociais já configuradas'
);

-- Acesso anônimo: somente views, nunca as tabelas base
set local role anon;
select throws_ok(
  $$select 1 from public.caes$$,
  '42501', null, 'nega ao anônimo a leitura direta da tabela de cães'
);
select throws_ok(
  $$select 1 from public.historias$$,
  '42501', null, 'nega ao anônimo a leitura direta da tabela de histórias'
);
select throws_ok(
  $$insert into public.caes (name, description, birth_year, gender, size)
    values ('Invasor', 'Tentativa anônima', 2020, 'macho', 'medio')$$,
  '42501', null, 'nega ao anônimo a criação de cães'
);
select throws_ok(
  $$insert into public.historias (name, description, photos)
    values ('Invasor', 'Tentativa anônima', array['h1.webp'])$$,
  '42501', null, 'nega ao anônimo a criação de histórias'
);
select lives_ok($$select 1 from public.caes_public$$, 'permite ao anônimo ler o catálogo público');
select lives_ok($$select 1 from public.historias_public$$, 'permite ao anônimo ler as histórias publicadas');

-- Acesso administrativo: exige papel admin e sessão aal2
set local role authenticated;
select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal1"}', true);
select is((select count(*) from public.caes), 0::bigint, 'nega cães a admin sem aal2');
select is((select count(*) from public.historias), 0::bigint, 'nega histórias a admin sem aal2');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"reader"},"aal":"aal2"}', true);
select is((select count(*) from public.caes), 0::bigint, 'nega cães a conta sem papel admin');
select is((select count(*) from public.historias), 0::bigint, 'nega histórias a conta sem papel admin');

select set_config('request.jwt.claims', '{"app_metadata":{"role":"admin"},"aal":"aal2"}', true);
select is((select count(*) from public.caes), 4::bigint, 'autoriza o catálogo completo a admin com aal2');
select is((select count(*) from public.historias), 2::bigint, 'autoriza as histórias a admin com aal2');
select lives_ok(
  $$update public.caes set status = 'adotado' where name = 'Destaque'$$,
  'permite ao admin com aal2 alterar o status do cão'
);

select * from finish();
rollback;
