-- Dados fictícios de validação local. Roda após as migrations no `supabase db reset`.

insert into public.social_links (network, url, display_order) values
  ('facebook', null, 1),
  ('instagram', null, 2)
on conflict (network) do update set url = excluded.url, display_order = excluded.display_order;

update public.site_settings set
  donation_pix_key = null,
  donation_pix_receiver = null,
  donation_pix_city = null,
  recurring_donation_urls = '{}'::jsonb,
  volunteer_form_url = null,
  adoption_form_url = 'https://forms.gle/nLSjXJyeLGUJXZj27'
where singleton;

update public.event_settings set
  default_max_raffle_numbers = 10,
  default_max_product_units = 10,
  default_reservation_ttl = interval '30 minutes',
  event_export_email = null,
  default_pix_key = null,
  default_pix_receiver = null,
  default_pix_city = null,
  default_pix_copy_paste = null,
  default_post_payment_instructions = null
where singleton;

insert into public.caes (
  name, description, birth_year, gender, size, status, photos, featured
) values
  ('Negão',    'Cão dócil resgatado da rua.',         2018, 'macho', 'grande',  'disponivel', '{}', true),
  ('Dentinho', 'Brincalhão, se dá bem com crianças.', 2021, 'macho', 'medio',   'disponivel', '{}', true),
  ('Doguinho', 'Filhote cheio de energia.',           2023, 'macho', 'pequeno', 'disponivel', '{}', true),
  ('Mel',      'Calma e companheira.',                2019, 'femea', 'medio',   'disponivel', '{}', false),
  ('Bidu',     'Já encontrou um lar.',                2020, 'macho', 'grande',  'adotado',    '{}', false),
  ('Fumaça',   'Em memória.',                         2012, 'femea', 'pequeno', 'falecido',   '{}', false);

insert into public.historias (name, description, photos, published) values
  ('Maia',     'Do resgate à chegada em seu novo lar.', '{historias/maia-1.jpg,historias/maia-2.jpg}', false),
  ('Clarinha', 'Uma recuperação cercada de cuidado.',   '{historias/clarinha-1.jpg}', true),
  ('Moleque',  'A história de uma adoção muito feliz.', '{historias/moleque-1.jpg}', false);
