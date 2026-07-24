-- Override opcional do formulário de adoção por cão.
-- O valor global de site_settings.adoption_form_url continua sendo o padrão;
-- a coluna é anulável para não recriar a duplicação obrigatória removida em 20260722120000.
alter table public.caes
  add column adoption_form_url text
    check (adoption_form_url is null or adoption_form_url ~* '^https://');

drop view public.caes_public;

create view public.caes_public as
  select id, name, description, birth_year, gender, size, photos, featured, adoption_form_url
  from public.caes
  where status = 'disponivel'
  order by featured desc, created_at desc;

grant select on public.caes_public to anon, authenticated;
