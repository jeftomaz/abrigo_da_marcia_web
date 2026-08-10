begin;

set local role postgres;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like '%\_public' escape '\'),
  11::bigint,
  'mantém somente as onze views públicas previstas'
);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like '%\_public' escape '\'
      and c.reloptions @> array['security_barrier=true']),
  11::bigint,
  'protege os filtros de todas as views com security barrier'
);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like '%\_public' escape '\'
      and c.reloptions @> array['security_invoker=false']),
  11::bigint,
  'mantém security definer explícito para não abrir as tabelas-base'
);

select ok(
  (select bool_and(has_table_privilege('anon', format('public.%I', c.relname), 'select'))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like '%\_public' escape '\'),
  'permite ao visitante consultar todas as views públicas'
);

select ok(
  (select bool_and(has_table_privilege('authenticated', format('public.%I', c.relname), 'select'))
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like '%\_public' escape '\'),
  'permite ao usuário autenticado consultar todas as views públicas'
);

select ok(
  not exists (
    select 1
    from (values
      ('caes'), ('eventos'), ('historias'), ('produto_variacao_opcoes'),
      ('produto_variacoes'), ('produtos'), ('reserva_numeros'), ('rifa_premios'),
      ('rifas'), ('site_settings'), ('social_links')
    ) as base(table_name)
    where has_table_privilege('anon', format('public.%I', base.table_name), 'select')
  ),
  'nega ao visitante a leitura direta de todas as tabelas-base'
);

select is(
  (select jsonb_object_agg(table_name, column_names)
    from (
      select table_name, string_agg(column_name, ',' order by ordinal_position) as column_names
      from information_schema.columns
      where table_schema = 'public' and table_name like '%\_public' escape '\'
      group by table_name
    ) public_surfaces),
  '{
    "caes_public": "id,name,description,birth_year,gender,size,photos,featured,adoption_form_url",
    "eventos_public": "id,name,description,type,status,photos,start_date,end_date,fundraising_goal_cents,max_items_per_reservation,reservation_ttl_seconds,pix_key,pix_receiver,pix_city,post_payment_instructions,created_at",
    "historias_public": "id,name,description,photos",
    "produto_variacao_opcoes_public": "id,variation_id,name,display_order",
    "produto_variacoes_public": "id,product_id,name,display_order",
    "produtos_public": "id,event_id,name,description,photos,unit_price_cents,discount_min_quantity,discount_unit_price_cents,measurement_table,measurement_image,display_order",
    "rifa_numeros_public": "event_id,number,available",
    "rifa_premios_public": "id,event_id,name,photo,display_order,winning_number,drawn_at",
    "rifas_public": "event_id,total_numbers,number_price_cents",
    "site_settings_public": "adoption_form_url,volunteer_form_url,pix_key,pix_receiver,pix_city,recurring_donation_urls",
    "social_links_public": "network,url,display_order"
  }'::jsonb,
  'trava a superfície exata de colunas das views públicas'
);

select is(
  (select max_items_per_reservation from public.eventos_public
    where id = 'a1000000-0000-0000-0000-000000000001'),
  (select default_max_raffle_numbers from public.event_settings where singleton),
  'eventos_public expõe o limite padrão efetivo quando o evento não possui override'
);

select * from finish();
rollback;
