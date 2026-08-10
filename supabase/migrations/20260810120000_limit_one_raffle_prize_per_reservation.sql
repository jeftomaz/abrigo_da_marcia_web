create or replace function public.draw_raffle_prize(p_prize_id uuid)
returns table (
  prize_id uuid,
  winning_number integer,
  winner_name text,
  drawn_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prize public.rifa_premios%rowtype;
  selected_number integer;
  selected_name text;
begin
  select * into prize from public.rifa_premios where id = p_prize_id for update;
  if prize.id is null then raise exception 'Prêmio não encontrado.'; end if;

  perform 1
  from public.eventos
  where id = prize.event_id and status = 'ativo'
  for update;
  if not found then raise exception 'Somente uma rifa ativa pode ser sorteada.'; end if;

  select rn.number, r.customer_name
  into selected_number, selected_name
  from public.reserva_numeros rn
  join public.reservas r on r.id = rn.reservation_id
  where rn.raffle_id = prize.event_id
    and rn.released_at is null
    and r.status in ('paga', 'entregue')
    and r.customer_name is not null
    and not exists (
      select 1
      from public.reserva_numeros winning_reservation_number
      join public.rifa_premios other
        on other.event_id = prize.event_id
        and other.id <> prize.id
        and other.winning_number = winning_reservation_number.number
      where winning_reservation_number.raffle_id = prize.event_id
        and winning_reservation_number.reservation_id = r.id
        and winning_reservation_number.released_at is null
    )
  order by gen_random_uuid()
  limit 1;

  if selected_number is null then
    raise exception 'Não há reservas pagas elegíveis para este prêmio.';
  end if;

  update public.rifa_premios
  set winning_number = selected_number, winner_name = selected_name, drawn_at = now()
  where id = prize.id
  returning id, rifa_premios.winning_number, rifa_premios.winner_name, rifa_premios.drawn_at
  into prize_id, winning_number, winner_name, drawn_at;

  update public.eventos set updated_at = now() where id = prize.event_id;
  return next;
end;
$$;
