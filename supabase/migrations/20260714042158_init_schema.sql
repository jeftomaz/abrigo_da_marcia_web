-- Modelo aprovado em DATA_MODEL.md: social_links + caes.
-- Público lê apenas via views *_public; tabelas base ficam sob RLS sem acesso anon.
-- Policies de CRUD admin não entram aqui: dependem do modelo de Auth/MFA (fase admin).

-- updated_at automático, compartilhado pelas duas tabelas
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums do domínio de cães
create type public.cae_genero as enum ('macho', 'femea');
create type public.cae_porte as enum ('pequeno', 'medio', 'grande');
create type public.cae_status as enum ('disponivel', 'adotado', 'falecido');

-- Redes sociais exibidas no footer (URLs configuráveis pelo admin)
create table public.social_links (
  network text primary key,
  url text,
  display_order smallint not null unique,
  updated_at timestamptz not null default now()
);

create trigger social_links_set_updated_at
  before update on public.social_links
  for each row execute function public.set_updated_at();

-- Cães do catálogo de adoção
create table public.caes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  -- futuro (birth_year > ano atual) é validado no cadastro admin: CHECK exige expressão IMMUTABLE
  birth_year smallint not null check (birth_year between 1990 and 2100),
  gender public.cae_genero not null,
  size public.cae_porte not null,
  status public.cae_status not null default 'disponivel',
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger caes_set_updated_at
  before update on public.caes
  for each row execute function public.set_updated_at();

-- RLS: anon não acessa as tabelas base; sem policies para anon.
-- Policies de admin autenticado virão com o modelo de Auth/MFA.
alter table public.social_links enable row level security;
alter table public.caes enable row level security;

-- Views públicas (security definer por padrão: ignoram a RLS da base).
-- anon recebe SELECT apenas nas views, nunca nas tabelas.
create view public.social_links_public as
  select network, url, display_order
  from public.social_links
  where url is not null
  order by display_order;

create view public.caes_public as
  select id, name, description, birth_year, gender, size, photos
  from public.caes
  where status = 'disponivel'
  order by created_at desc;

grant select on public.social_links_public to anon, authenticated;
grant select on public.caes_public to anon, authenticated;
