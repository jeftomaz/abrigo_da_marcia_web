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

-- Bazar encerrado com catálogo completo (variação, desconto e guia de medidas em tabela) e
-- reservas paga/cancelada/entregue, para validar histórico, entrega e exportação localmente.
-- Passa por todo o ciclo (ativo -> encerrado) antes da rifa abaixo, já que só um evento
-- pode ficar ativo por vez.
insert into public.eventos (
  id, name, description, type, photos, start_date, end_date,
  fundraising_goal_cents, pix_key, pix_receiver, pix_city, pix_copy_paste,
  post_payment_instructions, data_verified_at
) values (
  'b1000000-0000-0000-0000-000000000001', 'Bazar de Inverno', 'Bazar fictício encerrado para validar histórico, entrega e exportação.',
  'produtos', '{eventos/bazar-teste/capa.jpg}', current_date - 10, current_date,
  300000, 'chave-pix-ficticia@example.com', 'Abrigo da Marcia (teste)', 'São Paulo',
  'PIX-FICTICIO-BAZAR-INVERNO', 'Envie o comprovante para o número (99) 99999-8888.', now()
);

insert into public.produtos (
  id, event_id, name, description, photos, unit_price_cents,
  discount_min_quantity, discount_unit_price_cents, measurement_table, display_order
) values (
  'b1100000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
  'Camiseta do Abrigo', 'Camiseta de algodão com a logo do abrigo.', '{eventos/bazar-teste/produto-1.jpg}',
  4000, 2, 3500,
  '{"variationId":"b1200000-0000-0000-0000-000000000001","sizes":["P","M","G"],"sections":[{"title":"Medidas","rows":[{"label":"Largura (cm)","values":["45","48","51"]},{"label":"Comprimento (cm)","values":["68","70","72"]}]}]}'::jsonb,
  1
);

insert into public.produto_variacoes (id, product_id, name, display_order) values
  ('b1200000-0000-0000-0000-000000000001', 'b1100000-0000-0000-0000-000000000001', 'Tamanho', 1);

insert into public.produto_variacao_opcoes (id, variation_id, name, display_order) values
  ('b1300000-0000-0000-0000-000000000001', 'b1200000-0000-0000-0000-000000000001', 'P', 1),
  ('b1300000-0000-0000-0000-000000000002', 'b1200000-0000-0000-0000-000000000001', 'M', 2),
  ('b1300000-0000-0000-0000-000000000003', 'b1200000-0000-0000-0000-000000000001', 'G', 3);

update public.eventos set status = 'ativo' where id = 'b1000000-0000-0000-0000-000000000001';

insert into public.sessoes_reserva (id) values
  ('b1400000-0000-0000-0000-000000000001'),
  ('b1400000-0000-0000-0000-000000000002'),
  ('b1400000-0000-0000-0000-000000000003');

select * from public.reserve_product_items(
  'b1000000-0000-0000-0000-000000000001', 'b1400000-0000-0000-0000-000000000001',
  'Ana Entregue', 'ana.entregue@example.com',
  '[{"productId":"b1100000-0000-0000-0000-000000000001","options":{"b1200000-0000-0000-0000-000000000001":"b1300000-0000-0000-0000-000000000002"}},{"productId":"b1100000-0000-0000-0000-000000000001","options":{"b1200000-0000-0000-0000-000000000001":"b1300000-0000-0000-0000-000000000003"}}]'::jsonb
);
update public.reservas set status = 'paga' where session_id = 'b1400000-0000-0000-0000-000000000001';

select * from public.reserve_product_items(
  'b1000000-0000-0000-0000-000000000001', 'b1400000-0000-0000-0000-000000000002',
  'Bruno Pago', '(31) 93456-7890',
  '[{"productId":"b1100000-0000-0000-0000-000000000001","options":{"b1200000-0000-0000-0000-000000000001":"b1300000-0000-0000-0000-000000000001"}}]'::jsonb
);
update public.reservas set status = 'paga' where session_id = 'b1400000-0000-0000-0000-000000000002';

select * from public.reserve_product_items(
  'b1000000-0000-0000-0000-000000000001', 'b1400000-0000-0000-0000-000000000003',
  'Carla Cancelou', 'carla.cancelou@example.com',
  '[{"productId":"b1100000-0000-0000-0000-000000000001","options":{"b1200000-0000-0000-0000-000000000001":"b1300000-0000-0000-0000-000000000001"}}]'::jsonb
);
update public.reservas set status = 'cancelada' where session_id = 'b1400000-0000-0000-0000-000000000003';

update public.eventos set status = 'encerrado' where id = 'b1000000-0000-0000-0000-000000000001';

update public.reservas set status = 'entregue' where session_id = 'b1400000-0000-0000-0000-000000000001';

-- Rifa ativa com números reservados em pendente/paga/cancelada, para validar reserva,
-- expiração automática e sorteio localmente. Prêmios ficam sem vencedor para permitir o sorteio na UI.
insert into public.eventos (
  id, name, description, type, photos, start_date, end_date,
  fundraising_goal_cents, pix_key, pix_receiver, pix_city, pix_copy_paste,
  post_payment_instructions, data_verified_at
) values (
  'a1000000-0000-0000-0000-000000000001', 'Rifa de Inverno', 'Rifa fictícia para validar reservas e sorteio localmente.',
  'rifa', '{eventos/rifa-teste/capa.jpg}', current_date - 5, current_date + 25,
  500000, 'chave-pix-ficticia@example.com', 'Abrigo da Marcia (teste)', 'São Paulo',
  'PIX-FICTICIO-RIFA-INVERNO', 'Envie o comprovante para o número (99) 99999-8888.', now()
);

insert into public.rifas (event_id, total_numbers, number_price_cents) values
  ('a1000000-0000-0000-0000-000000000001', 50, 2000);

insert into public.rifa_premios (id, event_id, name, photo, display_order) values
  ('a1100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Cesta de produtos pet', 'eventos/rifa-teste/premio-1.jpg', 1),
  ('a1100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Vale-compras pet shop', 'eventos/rifa-teste/premio-2.jpg', 2);

update public.eventos set status = 'ativo' where id = 'a1000000-0000-0000-0000-000000000001';

insert into public.sessoes_reserva (id) values
  ('a1200000-0000-0000-0000-000000000001'),
  ('a1200000-0000-0000-0000-000000000002'),
  ('a1200000-0000-0000-0000-000000000003');

select * from public.reserve_raffle_numbers(
  'a1000000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000001',
  'Fulano Pendente', 'fulano.pendente@example.com', array[10, 11]
);

select * from public.reserve_raffle_numbers(
  'a1000000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000002',
  'Maria Compradora', '(11) 91234-5678', array[20, 21, 22]
);
update public.reservas set status = 'paga' where session_id = 'a1200000-0000-0000-0000-000000000002';

select * from public.reserve_raffle_numbers(
  'a1000000-0000-0000-0000-000000000001', 'a1200000-0000-0000-0000-000000000003',
  'João Desistiu', '(21) 92345-6789', array[30]
);
update public.reservas set status = 'cancelada' where session_id = 'a1200000-0000-0000-0000-000000000003';
