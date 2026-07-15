-- Histórias de adoção são independentes do catálogo de cães.
-- Público lê apenas pela view; a tabela base permanece sob RLS.

create table public.historias (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger historias_set_updated_at
  before update on public.historias
  for each row execute function public.set_updated_at();

alter table public.historias enable row level security;

create view public.historias_public as
  select id, name, description, photos
  from public.historias
  order by created_at desc;

grant select on public.historias_public to anon, authenticated;
