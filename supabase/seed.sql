-- Dados de validação local. Roda no `supabase db reset` (bypassa RLS via role de seed).

-- Redes sociais: ambas sem URL → social_links_public deve retornar 0 linhas.
insert into public.social_links (network, url, display_order) values
  ('facebook', null, 1),
  ('instagram', null, 2);

-- Cães: mistura de portes/gêneros/idades. Inclui adotado e falecido,
-- que NÃO devem aparecer em caes_public.
insert into public.caes (name, description, birth_year, gender, size, status, photos) values
  ('Negão',     'Cão dócil resgatado da rua.',        2018, 'macho', 'grande',  'disponivel', '{caes/negao-1.jpg,caes/negao-2.jpg}'),
  ('Dentinho',  'Brincalhão, se dá bem com crianças.', 2021, 'macho', 'medio',   'disponivel', '{caes/dentinho-1.jpg}'),
  ('Doguinho',  'Filhote cheio de energia.',          2023, 'macho', 'pequeno', 'disponivel', '{caes/doguinho-1.jpg}'),
  ('Mel',       'Calma e companheira.',               2019, 'femea', 'medio',   'disponivel', '{caes/mel-1.jpg}'),
  ('Bidu',      'Já encontrou um lar.',               2020, 'macho', 'grande',  'adotado',    '{caes/bidu-1.jpg}'),
  ('Fumaça',    'Em memória.',                        2012, 'femea', 'pequeno', 'falecido',   '{caes/fumaca-1.jpg}');
