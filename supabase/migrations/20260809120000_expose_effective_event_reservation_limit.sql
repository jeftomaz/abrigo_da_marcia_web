drop view public.eventos_public;

create view public.eventos_public
with (security_barrier = true, security_invoker = false) as
  select e.id, e.name, e.description, e.type, e.status, e.photos, e.start_date, e.end_date,
    e.fundraising_goal_cents,
    coalesce(
      e.max_items_per_reservation,
      case e.type
        when 'rifa' then s.default_max_raffle_numbers
        when 'produtos' then s.default_max_product_units
      end
    ) as max_items_per_reservation,
    extract(epoch from e.reservation_ttl)::integer as reservation_ttl_seconds,
    e.pix_key, e.pix_receiver, e.pix_city, e.post_payment_instructions, e.created_at
  from public.eventos e
  cross join public.event_settings s
  where e.status in ('ativo', 'encerrado')
    and (e.status = 'encerrado' or current_date between e.start_date and e.end_date)
  order by case e.status when 'ativo' then 0 else 1 end,
    coalesce(e.activated_at, e.created_at) desc,
    e.created_at desc
  limit 4;

grant select on public.eventos_public to anon, authenticated;
