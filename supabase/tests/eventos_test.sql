begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(96);

-- Encerra qualquer evento ativo do seed dentro desta transação (revertida no rollback final),
-- já que só um evento pode ficar ativo por vez.
update public.eventos set status = 'encerrado' where status = 'ativo';
select set_config('app.confirmed_event_delete', 'on', true);
delete from public.eventos;
select set_config('app.confirmed_event_delete', 'off', true);

select is(
  (select default_max_raffle_numbers from public.event_settings where singleton),
  5,
  'limita o padrão de números por reserva de rifa'
);
select is(
  (select default_reservation_ttl from public.event_settings where singleton),
  interval '15 minutes',
  'reduz o prazo padrão de reservas pendentes'
);

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
select ok(not public.is_valid_reservation_name('Mario'), 'rejeita reserva com apenas um nome');
select ok(public.is_valid_reservation_name('Mario Jose'), 'aceita reserva com pelo menos dois nomes');
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
  select public.activate_event('40000000-0000-0000-0000-000000000001')
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
  select public.activate_event('40000000-0000-0000-0000-000000000002');
$$, 'P0001', 'Informe chave, recebedor e cidade do Pix antes de publicar.', 'explica publicação bloqueada por Pix ausente');
delete from public.eventos where id = '40000000-0000-0000-0000-000000000002';

select lives_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_key, pix_receiver, pix_city, post_payment_instructions, data_verified_at
  ) values (
    '10000000-0000-0000-0000-000000000001', 'Rifa teste', 'Validação transacional',
    'rifa', '{eventos/teste.jpg}', current_date - 1, current_date + 1,
    100000, 'chave-teste@example.com', 'Abrigo (teste)', 'Ribeirao Preto', 'Envie o comprovante.', now()
  );
  insert into public.rifas (event_id, total_numbers, number_price_cents)
    values ('10000000-0000-0000-0000-000000000001', 10, 1000);
  insert into public.rifa_premios (id, event_id, name, photo, display_order) values
    ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Prêmio 1', 'eventos/p1.jpg', 1),
    ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Prêmio 2', 'eventos/p2.jpg', 2);
  select public.activate_event('10000000-0000-0000-0000-000000000001');
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
    'Mario', 'mario@example.com', array[9]
  )
$$, 'P0001', 'Informe pelo menos dois nomes.', 'valida o nome completo dentro da reserva no banco');

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

select matches(
  (select reference_code from public.reservas where session_id = '12000000-0000-0000-0000-000000000001'),
  '^[0-9A-F]{12}$',
  'gera um código hexadecimal administrativo para a reserva'
);
select throws_ok($$
  update public.reservas set customer_name = 'Mario'
  where session_id = '12000000-0000-0000-0000-000000000001'
$$, 'P0001', 'Informe pelo menos dois nomes.', 'impede reduzir uma reserva existente para apenas um nome');
select throws_ok($$
  insert into public.reservas (event_id, session_id, customer_name, customer_contact, total_cents, expires_at, reference_code)
  values (
    '10000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002',
    'Código inválido', 'invalido@example.com', 1000, now() + interval '1 hour', 'CODIGO-INVALIDO'
  )
$$, '23514', null, 'rejeita código de reserva fora do formato hexadecimal');
select throws_ok($$
  insert into public.reservas (event_id, session_id, customer_name, customer_contact, total_cents, expires_at, reference_code)
  select event_id, '12000000-0000-0000-0000-000000000002', 'Código repetido', 'repetido@example.com',
    1000, now() + interval '1 hour', reference_code
  from public.reservas where session_id = '12000000-0000-0000-0000-000000000001'
$$, '23505', null, 'mantém o código de reserva único');

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

-- Reverter pagamento marcado por engano: paga -> pendente antes de qualquer sorteio.
select lives_ok($$
  update public.reservas set status = 'pendente'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'reverte pagamento para pendente');
select is(
  (select status from public.reservas where session_id = '12000000-0000-0000-0000-000000000003'),
  'pendente'::public.reserva_status,
  'a reserva revertida volta a pendente'
);
select ok(
  (select paid_at is null and expires_at > now() from public.reservas where session_id = '12000000-0000-0000-0000-000000000003'),
  'a reversão limpa paid_at e renova o prazo de expiração'
);
select lives_ok($$
  update public.reservas set status = 'paga'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'volta a marcar como paga para o sorteio');

-- Reverter cancelamento acidental na rifa quando os números ainda estão livres.
insert into public.sessoes_reserva (id) values ('12000000-0000-0000-0000-000000000004');
select is(
  (select total_cents from public.reserve_raffle_numbers(
    '10000000-0000-0000-0000-000000000001',
    '12000000-0000-0000-0000-000000000004',
    'Pessoa cancelável', 'cancelavel@example.com', array[7, 8]
  )),
  2000::bigint,
  'cria reserva para testar a reversão de cancelamento na rifa'
);
select lives_ok($$
  update public.reservas set status = 'cancelada'
  where session_id = '12000000-0000-0000-0000-000000000004'
$$, 'cancela a reserva da rifa');
select lives_ok($$
  update public.reservas set status = 'pendente'
  where session_id = '12000000-0000-0000-0000-000000000004'
$$, 'reverte o cancelamento reconquistando os números livres');
select ok(
  (select bool_and(released_at is null) from public.reserva_numeros rn
    join public.reservas r on r.id = rn.reservation_id
    where r.session_id = '12000000-0000-0000-0000-000000000004')
  and (select canceled_at is null and expires_at > now()
    from public.reservas where session_id = '12000000-0000-0000-0000-000000000004'),
  'a reversão do cancelamento reconquista os números e renova o prazo'
);

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
select ok(
  (select bool_and(winning_number = any(array[1, 2])) from public.rifa_premios
    where event_id = '10000000-0000-0000-0000-000000000001' and winning_number is not null),
  'reservas pendentes não participam do sorteio'
);

select throws_ok($$
  update public.reservas set status = 'pendente'
  where id = (
    select rn.reservation_id
    from public.reserva_numeros rn
    join public.rifa_premios rp on rp.event_id = rn.raffle_id and rp.winning_number = rn.number
    where rp.id = '11000000-0000-0000-0000-000000000001' and rn.released_at is null
  )
$$, 'P0001', 'Uma reserva sorteada não pode voltar para pendente.', 'reserva sorteada não volta para pendente');

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

-- Reverter entrega marcada por engano: entregue -> paga.
select lives_ok($$
  update public.reservas set status = 'paga'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'reverte a entrega para paga');
select ok(
  (select status = 'paga' and delivered_at is null
    from public.reservas where session_id = '12000000-0000-0000-0000-000000000003'),
  'a reversão da entrega limpa delivered_at'
);
select lives_ok($$
  update public.reservas set status = 'entregue'
  where session_id = '12000000-0000-0000-0000-000000000003'
$$, 'remarca a entrega após a reversão');

-- Reverter cancelamento é bloqueado quando o número já foi retomado por outra reserva:
-- a reserva 0001 foi cancelada e seus números 1 e 2 já estão com a reserva 0003.
select throws_ok($$
  update public.reservas set status = 'pendente'
  where session_id = '12000000-0000-0000-0000-000000000001'
$$, 'P0001', 'Um ou mais números desta reserva já foram reservados por outra pessoa.', 'cancelamento não volta se o número já foi retomado');

select lives_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_key, pix_receiver, pix_city, post_payment_instructions, data_verified_at
  ) values (
    '20000000-0000-0000-0000-000000000001', 'Produtos teste', 'Validação de desconto',
    'produtos', '{eventos/produto.jpg}', current_date - 1, current_date + 1,
    100000, 'chave-teste@example.com', 'Abrigo (teste)', 'Ribeirao Preto', 'Envie o comprovante.', now()
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
  select public.activate_event('20000000-0000-0000-0000-000000000001');
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

select lives_ok($$
  select public.update_event_reservation(
    (select id from public.reservas where session_id = '24000000-0000-0000-0000-000000000001'),
    'Cliente editado', 'editado@example.com', 'pendente', true, array[]::integer[],
    '[{"productId":"21000000-0000-0000-0000-000000000001","options":{"22000000-0000-0000-0000-000000000001":"23000000-0000-0000-0000-000000000001"}}]'::jsonb
  )
$$, 'edita os dados e itens da reserva em uma transação');
select is(
  (select customer_name from public.reservas where session_id = '24000000-0000-0000-0000-000000000001'),
  'Cliente editado',
  'persiste o nome editado'
);
select is(
  (select customer_contact from public.reservas where session_id = '24000000-0000-0000-0000-000000000001'),
  'editado@example.com',
  'persiste e normaliza o contato editado'
);
select is(
  (select total_cents from public.reservas where session_id = '24000000-0000-0000-0000-000000000001'),
  1000::bigint,
  'recalcula o total ao editar os itens'
);
select is(
  (select count(*) from public.reserva_produtos rp join public.reservas r on r.id = rp.reservation_id
    where r.session_id = '24000000-0000-0000-0000-000000000001'),
  1::bigint,
  'substitui as unidades da reserva sem duplicar itens'
);

select throws_ok($$
  select * from public.reserve_product_items(
    '20000000-0000-0000-0000-000000000001',
    '24000000-0000-0000-0000-000000000002',
    'Cliente inválido', 'invalido@example.com',
    '[{"productId":"21000000-0000-0000-0000-000000000001","options":{}}]'::jsonb
  )
$$, 'P0001', 'Escolha uma opção de cada variação de Camiseta.', 'rejeita produto sem todas as variações');

select lives_ok($$
  update public.reservas set status = 'paga'
  where session_id = '24000000-0000-0000-0000-000000000001';
  update public.eventos set status = 'encerrado'
  where id = '20000000-0000-0000-0000-000000000001';
$$, 'confirma e encerra uma reserva de produto');

select throws_ok($$
  insert into public.eventos (
    id, name, description, type, photos, start_date, end_date,
    fundraising_goal_cents, pix_key, pix_receiver, pix_city, post_payment_instructions, data_verified_at
  ) values (
    '30000000-0000-0000-0000-000000000001', 'Evento passado', 'Teste de período',
    'rifa', '{eventos/passado.jpg}', current_date - 10, current_date - 5,
    100000, 'chave-teste@example.com', 'Abrigo (teste)', 'Ribeirao Preto', 'Envie o comprovante.', now()
  );
  insert into public.rifas values ('30000000-0000-0000-0000-000000000001', 10, 1000);
  insert into public.rifa_premios (event_id, name, photo, display_order)
    values ('30000000-0000-0000-0000-000000000001', 'Prêmio', 'eventos/p.jpg', 1);
  select public.activate_event('30000000-0000-0000-0000-000000000001');
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
  update public.reservas set status = 'entregue'
  where session_id = '24000000-0000-0000-0000-000000000001'
$$, 'permite entregar produtos pagos após o encerramento');

select has_function(
  'public',
  'activate_event',
  array['uuid', 'uuid', 'timestamp with time zone', 'text', 'uuid'],
  'expõe a ativação auditada de eventos'
);
select is(
  has_function_privilege('authenticated', 'public.activate_event(uuid,uuid,timestamptz,text,uuid)', 'execute'),
  false,
  'impede que o navegador simule a confirmação do envio'
);
select is(
  has_function_privilege('service_role', 'public.activate_event(uuid,uuid,timestamptz,text,uuid)', 'execute'),
  true,
  'reserva a ativação confirmada à Edge Function'
);
select is(
  (
    select prosecdef
    from pg_proc
    where oid = 'public.activate_event(uuid,uuid,timestamptz,text,uuid)'::regprocedure
  ),
  true,
  'executa a ativação com os privilégios internos necessários'
);
select is(
  has_table_privilege('service_role', 'public.sessoes_reserva', 'select'),
  true,
  'permite que somente o backend inclua a sessão na exportação completa'
);
select is(
  (
    select confdeltype
    from pg_constraint
    where conname = 'event_deletion_audit_deleted_by_fkey'
      and conrelid = 'public.event_deletion_audit'::regclass
  ),
  'n'::"char",
  'preserva a auditoria e anula o ator quando um admin é removido'
);

insert into public.eventos (
  id, name, description, type, photos, start_date, end_date,
  fundraising_goal_cents, pix_key, pix_receiver, pix_city,
  post_payment_instructions, data_verified_at
) values
  (
    '50000000-0000-0000-0000-000000000001', 'Terceiro evento', 'Histórico para validar o teto.',
    'produtos', '{eventos/terceiro.jpg}', current_date - 1, current_date + 1,
    100000, 'pix@example.com', 'Abrigo Teste', 'Sao Paulo', 'Envie o comprovante.', now()
  ),
  (
    '60000000-0000-0000-0000-000000000001', 'Quarto evento', 'Histórico para validar o teto.',
    'produtos', '{eventos/quarto.jpg}', current_date - 1, current_date + 1,
    100000, 'pix@example.com', 'Abrigo Teste', 'Sao Paulo', 'Envie o comprovante.', now()
  ),
  (
    '70000000-0000-0000-0000-000000000001', 'Quinto evento', 'Ativação que remove o mais antigo.',
    'produtos', '{eventos/quinto.jpg}', current_date - 1, current_date + 1,
    100000, 'pix@example.com', 'Abrigo Teste', 'Sao Paulo', 'Envie o comprovante.', now()
  );

insert into public.produtos (
  event_id, name, description, photos, unit_price_cents, display_order
) values
  ('50000000-0000-0000-0000-000000000001', 'Produto 3', 'Produto de teste', '{eventos/p3.jpg}', 1000, 1),
  ('60000000-0000-0000-0000-000000000001', 'Produto 4', 'Produto de teste', '{eventos/p4.jpg}', 1000, 1),
  ('70000000-0000-0000-0000-000000000001', 'Produto 5', 'Produto de teste', '{eventos/p5.jpg}', 1000, 1);

select public.activate_event('50000000-0000-0000-0000-000000000001');
update public.eventos set status = 'encerrado'
where id = '50000000-0000-0000-0000-000000000001';
select throws_ok(
  $$update public.eventos set status = 'arquivado'
    where id = '50000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'Eventos encerrados permanecem no histórico até a exclusão automática.',
  'preserva três eventos encerrados em vez de permitir arquivamento manual'
);
select public.activate_event('60000000-0000-0000-0000-000000000001');
update public.eventos set status = 'encerrado'
where id = '60000000-0000-0000-0000-000000000001';
select set_config('app.confirmed_event_activation', 'off', true);

select throws_ok(
  $$update public.eventos set status = 'ativo'
    where id = '70000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'Publique o evento pelo fluxo de ativação com exportação automática.',
  'impede ativação direta que contornaria a exportação'
);
select throws_ok(
  $$select public.activate_event('70000000-0000-0000-0000-000000000001')$$,
  'P0001',
  'A cópia do evento mais antigo precisa ser enviada antes da publicação.',
  'recusa o quinto evento sem confirmação da exportação'
);

update public.event_settings
set event_export_email = 'abrigo@example.com'
where singleton;
select throws_ok(
  $$select public.activate_event(
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    now(),
    'outro@example.com'
  )$$,
  'P0001',
  'O destinatário da cópia mudou durante a publicação; envie novamente.',
  'confirma que a cópia foi enviada ao e-mail atualmente configurado'
);
select lives_ok(
  $$select public.activate_event(
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    now(),
    'abrigo@example.com'
  )$$,
  'exclui o mais antigo somente após a cópia e ativa o quinto'
);
select is(
  (select count(*) from public.eventos where status <> 'rascunho'),
  4::bigint,
  'mantém quatro eventos já ativados no banco'
);
select is(
  (select count(*) from public.eventos where status = 'ativo'),
  1::bigint,
  'mantém exatamente um evento ativo'
);
select is(
  (select count(*) from public.eventos where status = 'encerrado'),
  3::bigint,
  'mantém os três eventos encerrados mais recentes'
);
select is(
  (select count(*) from public.eventos where id = '10000000-0000-0000-0000-000000000001'),
  0::bigint,
  'remove o evento com a ativação mais antiga'
);
select is(
  (select count(*) from public.event_deletion_audit
    where event_id = '10000000-0000-0000-0000-000000000001'
      and export_email = 'abrigo@example.com'),
  1::bigint,
  'audita o destinatário e a exclusão automática'
);
select is(
  (select count(*) from public.eventos_public),
  4::bigint,
  'limita a exposição pública aos quatro eventos preservados'
);

-- Limitação por IP. As asserções sem cabeçalho vêm primeiro: uma vez definido,
-- request.headers não volta a ficar ausente dentro da transação.
select ok(
  public.current_request_ip_hash() is null,
  'não atribui tentativa quando a chamada não traz IP de origem (seed, cron, psql)'
);
select has_trigger('public', 'sessoes_reserva', 'sessoes_reserva_limit_ip', 'protege a criação de sessões por IP');
select has_trigger('public', 'reservas', 'reservas_limit_ip', 'protege a criação de reservas por IP');

select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.10"}', true);
select is(
  public.current_request_ip_hash(),
  public.current_request_ip_hash(),
  'gera o mesmo identificador para o mesmo IP'
);
select isnt(
  (select encode(public.current_request_ip_hash(), 'hex')),
  (select encode(extensions.digest('203.0.113.10', 'sha256'), 'hex')),
  'aplica sal ao hash, impedindo reverter o IP por força bruta'
);

create temporary table ip_hash_fixture (rotulo text primary key, hash bytea);
insert into ip_hash_fixture values ('cf', public.current_request_ip_hash());
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.11, 10.0.0.1"}', true);
insert into ip_hash_fixture values ('xff', public.current_request_ip_hash());
select isnt(
  (select hash from ip_hash_fixture where rotulo = 'cf'),
  (select hash from ip_hash_fixture where rotulo = 'xff'),
  'distingue IPs de origem diferentes, lendo também o primeiro salto de x-forwarded-for'
);

select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.20"}', true);
select is(
  (select count(*) from (select public.create_reservation_session() from generate_series(1, 60)) criadas),
  60::bigint,
  'permite as sessões previstas para uma mesma conexão'
);
select throws_ok(
  $$select public.create_reservation_session()$$,
  'P0001', 'Muitas tentativas a partir desta conexão. Tente novamente mais tarde.',
  'recusa novas sessões após o teto por IP'
);

select set_config('request.headers', '{"cf-connecting-ip":"203.0.113.21"}', true);
select lives_ok(
  $$select public.create_reservation_session()$$,
  'preserva o acesso de outra conexão ao teto de sessões'
);

insert into public.sessoes_reserva (id) values ('25000000-0000-0000-0000-000000000001');
insert into public.reservas (event_id, session_id, customer_name, customer_contact, total_cents, expires_at)
select '20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001',
  'Teste de limite', 'pessoa@example.com', 1000, now() + interval '1 hour'
from generate_series(1, 20);
select throws_ok(
  $$insert into public.reservas (event_id, session_id, customer_name, customer_contact, total_cents, expires_at)
    values ('20000000-0000-0000-0000-000000000001', '25000000-0000-0000-0000-000000000001',
      'Teste de limite', 'pessoa@example.com', 1000, now() + interval '1 hour')$$,
  'P0001', 'Limite de reservas atingido para esta conexão. Tente novamente mais tarde.',
  'recusa novas reservas após o teto por IP, mesmo trocando de sessão'
);

update public.reserva_ip_tentativas set created_at = now() - interval '25 hours';
select lives_ok(
  $$select public.expire_event_reservations()$$,
  'executa a manutenção periódica das reservas'
);
select is(
  (select count(*) from public.reserva_ip_tentativas),
  0::bigint,
  'descarta o histórico de tentativas por IP após 24 horas'
);

set local role anon;
select throws_ok(
  $$select 1 from public.reserva_ip_tentativas$$,
  '42501', null, 'mantém o histórico de IPs fora do alcance do público'
);
set local role postgres;

select * from finish();
rollback;
