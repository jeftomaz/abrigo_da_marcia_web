-- Dados de validação local. Roda no `supabase db reset` (bypassa RLS via role de seed).

-- Redes sociais: ambas sem URL → social_links_public deve retornar 0 linhas.
insert into public.social_links (network, url, display_order) values
  ('facebook', null, 1),
  ('instagram', null, 2);

-- Cães: mistura de portes/gêneros/idades. Inclui adotado e falecido,
-- que NÃO devem aparecer em caes_public.
insert into public.caes (
  name,
  description,
  birth_year,
  gender,
  size,
  status,
  photos,
  adoption_form_url,
  featured
) values
  ('Negão',    'Cão dócil resgatado da rua.',         2018, 'macho', 'grande',  'disponivel', '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', true),
  ('Dentinho', 'Brincalhão, se dá bem com crianças.', 2021, 'macho', 'medio',   'disponivel', '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', true),
  ('Doguinho', 'Filhote cheio de energia.',           2023, 'macho', 'pequeno', 'disponivel', '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', true),
  ('Mel',      'Calma e companheira.',                2019, 'femea', 'medio',   'disponivel', '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', false),
  ('Bidu',     'Já encontrou um lar.',                2020, 'macho', 'grande',  'adotado',    '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', false),
  ('Fumaça',   'Em memória.',                         2012, 'femea', 'pequeno', 'falecido',   '{}', 'https://forms.gle/nLSjXJyeLGUJXZj27', false);

-- Histórias são registros independentes e não exigem os atributos do catálogo.
insert into public.historias (name, description, photos, published) values
  ('Maia',     'Do resgate à chegada em seu novo lar.', '{historias/maia-1.jpg,historias/maia-2.jpg}', false),
  ('Clarinha', 'Uma recuperação cercada de cuidado.',   '{historias/clarinha-1.jpg}', true),
  ('Moleque',  'A história de uma adoção muito feliz.', '{historias/moleque-1.jpg}', false);

-- Acesso temporário apenas no stack local, enquanto Auth/MFA não foi implementado.
-- `seed.sql` não é aplicado por `supabase db push` em projetos hospedados.
grant select, insert, update, delete on public.caes to anon;
grant select, insert, update, delete on public.historias to anon;

create policy "Local admin reads dogs"
  on public.caes
  for select
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin creates dogs"
  on public.caes
  for insert
  to anon
  with check (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin updates dogs"
  on public.caes
  for update
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  )
  with check (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin deletes dogs"
  on public.caes
  for delete
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin reads stories"
  on public.historias
  for select
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin creates stories"
  on public.historias
  for insert
  to anon
  with check (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin updates stories"
  on public.historias
  for update
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  )
  with check (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin deletes stories"
  on public.historias
  for delete
  to anon
  using (
    coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin uploads media photos"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'dog-photos'
    and coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin reads media photo objects"
  on storage.objects
  for select
  to anon
  using (
    bucket_id = 'dog-photos'
    and coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );

create policy "Local admin deletes media photos"
  on storage.objects
  for delete
  to anon
  using (
    bucket_id = 'dog-photos'
    and coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'origin'
      ~ '^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$'
  );
