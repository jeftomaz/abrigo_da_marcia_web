begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select lives_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_copy_paste, post_payment_instructions, data_verified_at
  ) values (
    '10000000-0000-0000-0000-000000000001', 'Rifa teste', 'Validação transacional',
    'rifa', '{eventos/teste.jpg}', current_date - 1, current_date + 1,
    100000, 'PIX-VALIDO-NO-CONTEXTO-DO-TESTE', 'Envie o comprovante.', now()
  );
  insert into public.rifas (event_id, total_numbers, number_price_cents)
    values ('10000000-0000-0000-0000-000000000001', 10, 1000);
  insert into public.rifa_premios (id, event_id, name, photo, display_order) values
    ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Prêmio 1', 'eventos/p1.jpg', 1),
    ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Prêmio 2', 'eventos/p2.jpg', 2);
  update public.eventos set status = 'ativo' where id = '10000000-0000-0000-0000-000000000001';
$$, 'ativa uma rifa completamente configurada');

insert into public.sessoes_reserva (id) values
  ('12000000-0000-0000-0000-000000000001'),
  ('12000000-0000-0000-0000-000000000002'),
  ('12000000-0000-0000-0000-000000000003');

select is(
  (select total_cents from public.reserve_raffle_numbers(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000001',
    'Pessoa 1', 'pessoa1@example.com', array[1, 2]
  )),
  2000::bigint,
  'calcula o total da rifa no servidor'
);

select throws_ok($$
  select * from public.reserve_raffle_numbers(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000002',
    'Pessoa 2', 'pessoa2@example.com', array[2]
  )
$$, 'P0001', 'Um ou mais números acabaram de ser reservados. Atualize a seleção.', 'impede reserva concorrente do mesmo número');

update public.reservas set expires_at = now() - interval '1 minute'
where session_id = '12000000-0000-0000-0000-000000000001';

select is(public.expire_event_reservations(), 1, 'expira a reserva pendente');
select is(
  (select status from public.reservas where session_id = '12000000-0000-0000-0000-000000000001'),
  'cancelada'::public.reserva_status,
  'marca a reserva vencida como cancelada'
);
select ok(
  (select bool_and(released_at is not null) from public.reserva_numeros rn
    join public.reservas r on r.id = rn.reservation_id
    where r.session_id = '12000000-0000-0000-0000-000000000001'),
  'libera os números da reserva expirada'
);

select is(
  (select total_cents from public.reserve_raffle_numbers(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000003',
    'Pessoa vencedora', 'vencedora@example.com', array[1, 2]
  )),
  2000::bigint,
  'permite reutilizar números liberados'
);

select lives_ok($$
  update public.reservas set status = 'paga'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'confirma pagamento pendente');

select lives_ok(
  $$select * from public.draw_raffle_prize('11000000-0000-0000-0000-000000000001')$$,
  'persiste o primeiro sorteio entre reservas pagas'
);
select lives_ok(
  $$select * from public.draw_raffle_prize('11000000-0000-0000-0000-000000000002')$$,
  'persiste o segundo sorteio entre reservas pagas'
);
select isnt(
  (select winning_number from public.rifa_premios where id = '11000000-0000-0000-0000-000000000001'),
  (select winning_number from public.rifa_premios where id = '11000000-0000-0000-0000-000000000002'),
  'um número não ganha dois prêmios'
);

select throws_ok($$
  update public.eventos set type = 'produtos'
  where id = '10000000-0000-0000-0000-000000000001'
$$, 'P0001', 'O tipo do evento não pode mudar depois da primeira reserva.', 'tipo fica imutável após reserva');

select lives_ok($$
  update public.eventos set status = 'encerrado'
  where id = '10000000-0000-0000-0000-000000000001'
$$, 'encerra o evento ativo');

select lives_ok($$
  update public.reservas set status = 'entregue'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'permite entrega da reserva paga e sorteada após o encerramento');

select lives_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_copy_paste, post_payment_instructions, data_verified_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'Produtos teste', 'Validação de desconto',
    'produtos', '{eventos/produto.jpg}', current_date - 1, current_date + 1,
    100000, 'PIX-VALIDO-NO-CONTEXTO-DO-TESTE', 'Envie o comprovante.', now()
  );
  insert into public.produtos (
    id, event_id, name, description, photos, unit_price_cents,
    discount_min_quantity, discount_unit_price_cents, display_order
  ) values (
    '21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    'Camiseta', 'Camiseta teste', '{eventos/camiseta.jpg}', 1000, 2, 800, 1
  );
  insert into public.produto_variacoes (id, product_id, name, display_order)
    values ('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Tamanho', 1);
  insert into public.produto_variacao_opcoes (id, variation_id, name, display_order)
    values ('23000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'M', 1);
  update public.eventos set status = 'ativo' where id = '20000000-0000-0000-0000-000000000001';
$$, 'ativa evento com catálogo de produtos');

insert into public.sessoes_reserva (id) values
  ('24000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-000000000002');

select is(
  (select total_cents from public.reserve_product_items(
    '20000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000001',
    'Cliente produto', 'produto@example.com',
    '[{"productId":"21000000-0000-0000-0000-000000000001","options":{"22000000-0000-0000-0000-000000000001":"23000000-0000-0000-0000-000000000001"}},{"productId":"21000000-0000-0000-0000-000000000001","options":{"22000000-0000-0000-0000-000000000001":"23000000-0000-0000-0000-000000000001"}}]'::jsonb
  )),
  1600::bigint,
  'aplica desconto por quantidade do mesmo produto'
);

select throws_ok($$
  select * from public.reserve_product_items(
    '20000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000002',
    'Cliente inválido', 'invalido@example.com',
    '[{"productId":"21000000-0000-0000-0000-000000000001","options":{}}]'::jsonb
  )
$$, 'P0001', 'Escolha uma opção de cada variação de Camiseta.', 'rejeita produto sem todas as variações');

select throws_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_copy_paste, post_payment_instructions, data_verified_at
  ) values (
    '30000000-0000-0000-0000-000000000001', 'Evento passado', 'Teste de período',
    'rifa', '{eventos/passado.jpg}', current_date - 10, current_date - 5,
    100000, 'PIX-VALIDO-NO-CONTEXTO-DO-TESTE', 'Envie o comprovante.', now()
  );
  insert into public.rifas values ('30000000-0000-0000-0000-000000000001', 10, 1000);
  insert into public.rifa_premios (event_id, name, photo, display_order)
    values ('30000000-0000-0000-0000-000000000001', 'Prêmio', 'eventos/p.jpg', 1);
  update public.eventos set status = 'ativo' where id = '30000000-0000-0000-0000-000000000001';
$$, 'P0001', 'Um evento só pode ficar ativo dentro do período informado.', 'impede ativar evento passado');

select ok(
  public.is_valid_measurement_table('{"sizes":["P","M"],"sections":[{"title":"Medidas","rows":[{"label":"Busto","values":["80","90"]}]}]}'::jsonb),
  'aceita tabela de medidas estruturalmente válida'
);
select ok(
  not public.is_valid_measurement_table('{"sizes":["P","M"],"sections":[{"title":"Medidas","rows":[{"label":"Busto","values":["80"]}]}]}'::jsonb),
  'rejeita tabela com quantidade de valores divergente'
);

select lives_ok($$
  update public.reservas set status = 'paga'
  where session_id = '24000000-0000-0000-0000-000000000001';
  update public.eventos set status = 'encerrado'
  where id = '20000000-0000-0000-0000-000000000001';
$$, 'confirma e encerra uma reserva de produto');
select lives_ok($$
  update public.reservas set status = 'entregue'
  where session_id = '24000000-0000-0000-0000-000000000001'
$$, 'permite entregar produtos pagos após o encerramento');

select * from finish();
rollback;
