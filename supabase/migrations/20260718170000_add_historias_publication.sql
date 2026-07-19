alter table public.historias
  add column published boolean not null default false;

create or replace view public.historias_public as
  select id, name, description, photos
  from public.historias
  where published
  order by created_at desc;
