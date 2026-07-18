alter table public.caes
  add column adoption_form_url text not null
    default 'https://forms.gle/nLSjXJyeLGUJXZj27'
    check (adoption_form_url ~ '^https?://'),
  add column featured boolean not null default false;

create or replace view public.caes_public as
  select
    id,
    name,
    description,
    birth_year,
    gender,
    size,
    photos,
    adoption_form_url,
    featured
  from public.caes
  where status = 'disponivel'
  order by featured desc, created_at desc;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dog-photos',
  'dog-photos',
  true,
  500000,
  array['image/jpeg', 'image/png', 'image/webp']
);
