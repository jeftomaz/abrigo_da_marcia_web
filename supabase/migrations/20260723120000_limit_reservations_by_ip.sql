-- Limitação por IP na borda do banco. O intervalo por sessão só freia abuso acidental:
-- trocar de sessão custa uma chamada de create_reservation_session. Triggers protegem
-- os dois pontos de entrada independentemente da origem, como reservas_validate_contact.

create type public.reserva_tentativa_tipo as enum ('sessao', 'reserva');

-- Sal aleatório por instalação: o IP nunca é armazenado em claro, e sem o sal um
-- sha256 de IPv4 seria reversível por força bruta em qualquer cópia do banco.
create table public.reserva_ip_sal (
  singleton boolean primary key default true check (singleton),
  sal bytea not null default extensions.gen_random_bytes(32)
);
insert into public.reserva_ip_sal default values;

create table public.reserva_ip_tentativas (
  id bigint generated always as identity primary key,
  ip_hash bytea not null,
  kind public.reserva_tentativa_tipo not null,
  created_at timestamptz not null default now()
);

create index reserva_ip_tentativas_janela
  on public.reserva_ip_tentativas (ip_hash, kind, created_at desc);

alter table public.reserva_ip_sal enable row level security;
alter table public.reserva_ip_tentativas enable row level security;

-- Sem policies: apenas as funções security definer abaixo enxergam estas tabelas.
-- Nem o admin lê o histórico de IPs, que não tem uso administrativo.

-- cf-connecting-ip é preenchido pela borda do Supabase e não é falsificável pelo client;
-- x-forwarded-for atende outros deploys, aceitando o primeiro salto da cadeia.
create function public.current_request_ip_hash()
returns bytea
language sql
stable
security definer
set search_path = ''
as $$
  select extensions.digest(convert_to(ip, 'UTF8') || (select sal from public.reserva_ip_sal), 'sha256')
  from (
    select coalesce(
      nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), ''),
      nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), '')
    ) as ip
  ) origem
  where ip is not null;
$$;

create function public.enforce_reservation_ip_limit(
  p_kind public.reserva_tentativa_tipo,
  p_limit integer,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hash bytea := public.current_request_ip_hash();
begin
  -- Sem cabeçalho de origem (psql, seed, cron) não há a quem atribuir a tentativa.
  if hash is null then return; end if;

  if (
    select count(*) from public.reserva_ip_tentativas
    where ip_hash = hash and kind = p_kind and created_at > now() - interval '1 hour'
  ) >= p_limit then
    raise exception '%', p_message;
  end if;

  insert into public.reserva_ip_tentativas (ip_hash, kind) values (hash, p_kind);
end;
$$;

create function public.limit_reservation_sessions_by_ip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Cada aba abre sua própria sessão e operadoras compartilham IP por NAT:
  -- o teto precisa ser alto o bastante para não barrar visitantes legítimos.
  perform public.enforce_reservation_ip_limit(
    'sessao', 60, 'Muitas tentativas a partir desta conexão. Tente novamente mais tarde.'
  );
  return new;
end;
$$;

create function public.limit_reservations_by_ip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enforce_reservation_ip_limit(
    'reserva', 20, 'Limite de reservas atingido para esta conexão. Tente novamente mais tarde.'
  );
  return new;
end;
$$;

create trigger sessoes_reserva_limit_ip
  before insert on public.sessoes_reserva
  for each row execute function public.limit_reservation_sessions_by_ip();

create trigger reservas_limit_ip
  before insert on public.reservas
  for each row execute function public.limit_reservations_by_ip();

-- A janela é de uma hora; manter 24h dá folga para inspeção sem acumular histórico.
create or replace function public.expire_event_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.eventos set status = 'encerrado'
  where status = 'ativo' and end_date < current_date;

  update public.reservas
  set status = 'cancelada'
  where status = 'pendente' and expires_at <= now();
  get diagnostics affected = row_count;

  delete from public.sessoes_reserva s
  where s.updated_at < now() - interval '30 days'
    and not exists (select 1 from public.reservas r where r.session_id = s.id);

  delete from public.reserva_ip_tentativas
  where created_at < now() - interval '24 hours';
  return affected;
end;
$$;

revoke all on function public.current_request_ip_hash() from public;
revoke all on function public.enforce_reservation_ip_limit(public.reserva_tentativa_tipo, integer, text) from public;
