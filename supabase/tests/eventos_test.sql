begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

select throws_ok(
  $$update public.event_settings set default_reservation_ttl = interval '30 seconds' where singleton$$,
  '23514', null, 'rejeita prazo padrão abaixo de um minuto inteiro'
);

select ok(public.is_valid_reservation_contact('pessoa@example.com'), 'aceita e-mail completo');
select ok(public.is_valid_reservation_contact('(11) 91234-5678'), 'aceita celular brasileiro com DDD');
select ok(public.is_valid_reservation_contact('(11) 2345-6789'), 'aceita telefone fixo brasileiro com DDD');
select ok(not public.is_valid_reservation_contact('(00) 00000-0000'), 'rejeita telefone fictício');
select ok(not public.is_valid_reservation_contact('João da Silva'), 'rejeita nome no campo de contato');
select ok(not public.is_valid_reservation_contact('pessoa@gmail'), 'rejeita e-mail sem domínio completo');
select is(
  public.normalize_reservation_contact('(11) 91234-5678'),
  '+5511912345678',
  'normaliza telefone para o formato internacional'
);

select lives_ok($$
  insert into public.eventos (id, type, start_date, draft_payload)
  values (
    '40000000-0000-0000-0000-000000000001',
    'produtos',
    current_date,
    '{"kind":"product","startDate":"2026-07-21"}'::jsonb
  )
$$, 'salva rascunho com somente um campo preenchido');
select is(
  (select status from public.eventos where id = '40000000-0000-0000-0000-000000000001'),
  'rascunho'::public.evento_status,
  'mantém formulário parcial como rascunho'
);
select throws_ok($$
  update public.eventos set status = 'ativo'
  where id = '40000000-0000-0000-0000-000000000001'
$$, 'P0001', 'Conclua e salve todos os campos do rascunho antes de publicar.', 'impede publicar payload parcial');
delete from public.eventos where id = '40000000-0000-0000-0000-000000000001';

select throws_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, post_payment_instructions, data_verified_at
  ) values (
    '40000000-0000-0000-0000-000000000002', 'Sem Pix', 'Validação da publicação',
    'produtos', '{eventos/sem-pix.jpg}', current_date - 1, current_date + 1,
    100000, 'Envie o comprovante.', now()
  );
  update public.eventos set status = 'ativo'
  where id = '40000000-0000-0000-0000-000000000002';
$$, 'P0001', 'Informe um código Pix copia e cola real antes de publicar.', 'explica publicação bloqueada por Pix ausente');
delete from public.eventos where id = '40000000-0000-0000-0000-000000000002';

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

select throws_ok(
  $$update public.eventos set name = null where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'mantém dados gerais obrigatórios depois da publicação'
);

select throws_ok(
  $$update public.eventos set reservation_ttl = interval '90 seconds' where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'rejeita prazo do evento fora de minutos inteiros'
);

insert into public.sessoes_reserva (id) values
  ('12000000-0000-0000-0000-000000000001'),
  ('12000000-0000-0000-0000-000000000002'),
  ('12000000-0000-0000-0000-000000000003');

select throws_ok($$
  select * from public.reserve_raffle_numbers(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000002',
    'Pessoa inválida', 'nome no lugar do contato', array[10]
  )
$$, 'P0001', 'Informe um telefone com DDD válido ou um e-mail completo.', 'valida contato também dentro da reserva no banco');

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

select throws_ok($$
  insert into public.produtos (
    event_id, name, description, photos, unit_price_cents,
    discount_min_quantity, discount_unit_price_cents, display_order
  ) values (
    '20000000-0000-0000-0000-000000000001', 'Desconto inalcançável', 'Teste',
    '{eventos/invalido.jpg}', 1000, 11, 800, 2
  )
$$, 'P0001', 'A quantidade mínima para desconto deve ser igual ou menor que o máximo de 10 unidades por reserva.', 'impede desconto acima do máximo por reserva');

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
