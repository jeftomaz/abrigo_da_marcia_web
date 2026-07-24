-- Reverter pagamento marcado por engano: permite paga -> pendente.
-- Bloqueada quando a reserva já foi sorteada (mesma regra do cancelamento) e renova o
-- expires_at com um TTL fresco, senão o cron cancelaria a reserva revertida no ato.
create or replace function public.validate_reservation_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_ttl interval;
begin
  if new.status = old.status then return new; end if;

  if old.status = 'pendente' and new.status = 'paga' then
    new.paid_at := now();
  elsif old.status = 'paga' and new.status = 'pendente' then
    if exists (
      select 1
      from public.reserva_numeros rn
      join public.rifa_premios rp on rp.event_id = rn.raffle_id and rp.winning_number = rn.number
      where rn.reservation_id = old.id
    ) then
      raise exception 'Uma reserva sorteada não pode voltar para pendente.';
    end if;
    select coalesce(e.reservation_ttl, s.default_reservation_ttl)
      into v_ttl
    from public.eventos e cross join public.event_settings s
    where e.id = old.event_id and s.singleton;
    new.paid_at := null;
    new.expires_at := now() + coalesce(v_ttl, interval '30 minutes');
  elsif old.status in ('pendente', 'paga') and new.status = 'cancelada' then
    if old.status = 'paga' and exists (
      select 1
      from public.reserva_numeros rn
      join public.rifa_premios rp on rp.event_id = rn.raffle_id and rp.winning_number = rn.number
      where rn.reservation_id = old.id
    ) then
      raise exception 'Uma reserva sorteada não pode ser cancelada.';
    end if;
    new.canceled_at := now();
  elsif old.status = 'paga' and new.status = 'entregue' then
    if not exists (
      select 1 from public.eventos e
      where e.id = old.event_id
        and e.status in ('encerrado', 'arquivado')
        and (
          e.type = 'produtos'
          or exists (
            select 1
            from public.reserva_numeros rn
            join public.rifa_premios rp on rp.event_id = e.id and rp.winning_number = rn.number
            where rn.reservation_id = old.id
          )
        )
    ) then
      raise exception 'A reserva ainda não pode ser marcada como entregue.';
    end if;
    new.delivered_at := now();
  else
    raise exception 'Transição de reserva inválida: % para %.', old.status, new.status;
  end if;
  return new;
end;
$$;
