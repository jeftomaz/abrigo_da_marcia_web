drop view public.rifa_premios_public;

create view public.rifa_premios_public
with (security_barrier = true, security_invoker = false) as
  select p.id, p.event_id, p.name, p.photo, p.display_order,
    p.winning_number, p.drawn_at
  from public.rifa_premios p
  join public.eventos e on e.id = p.event_id
  where e.status in ('ativo', 'encerrado')
  order by p.display_order;

grant select on public.rifa_premios_public to anon, authenticated;
