-- Reduz o estoque que uma reserva pendente pode bloquear por padrão.

alter table public.event_settings
  alter column default_max_raffle_numbers set default 5,
  alter column default_reservation_ttl set default interval '15 minutes';

update public.event_settings
set default_max_raffle_numbers = 5
where default_max_raffle_numbers = 10;

update public.event_settings
set default_reservation_ttl = interval '15 minutes'
where default_reservation_ttl = interval '30 minutes';
