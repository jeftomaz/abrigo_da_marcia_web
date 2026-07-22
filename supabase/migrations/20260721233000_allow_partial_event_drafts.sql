-- Rascunhos preservam o formulário parcial; eventos publicados continuam completos.

alter table public.eventos
  add column draft_payload jsonb
  check (draft_payload is null or jsonb_typeof(draft_payload) = 'object'),
  alter column name drop not null,
  alter column description drop not null,
  alter column start_date drop not null,
  alter column end_date drop not null,
  alter column fundraising_goal_cents drop not null,
  alter column post_payment_instructions drop not null;

alter table public.eventos
  add constraint eventos_complete_outside_draft_check
  check (
    status = 'rascunho' or (
      draft_payload is null
      and name is not null
      and description is not null
      and start_date is not null
      and end_date is not null
      and fundraising_goal_cents is not null
      and cardinality(photos) > 0
      and pix_copy_paste is not null
      and post_payment_instructions is not null
      and data_verified_at is not null
    )
  );

create or replace function public.validate_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  prize_count integer;
begin
  if new.type <> old.type and exists (select 1 from public.reservas where event_id = old.id) then
    raise exception 'O tipo do evento não pode mudar depois da primeira reserva.';
  end if;

  if new.status <> old.status then
    if not (
      (old.status = 'rascunho' and new.status = 'ativo') or
      (old.status = 'ativo' and new.status = 'encerrado') or
      (old.status = 'encerrado' and new.status in ('ativo', 'arquivado'))
    ) then
      raise exception 'Transição de status inválida: % para %.', old.status, new.status;
    end if;

    if new.status = 'ativo' then
      if new.draft_payload is not null then
        raise exception 'Conclua e salve todos os campos do rascunho antes de publicar.';
      end if;
      if new.name is null or btrim(new.name) = '' then
        raise exception 'Preencha o título antes de publicar.';
      end if;
      if new.description is null or btrim(new.description) = '' then
        raise exception 'Preencha a descrição antes de publicar.';
      end if;
      if new.start_date is null then
        raise exception 'Informe a data de início antes de publicar.';
      end if;
      if new.end_date is null then
        raise exception 'Informe a data de fim antes de publicar.';
      end if;
      if new.fundraising_goal_cents is null then
        raise exception 'Informe a meta de arrecadação antes de publicar.';
      end if;
      if new.post_payment_instructions is null or btrim(new.post_payment_instructions) = '' then
        raise exception 'Preencha as instruções pós-pagamento antes de publicar.';
      end if;
      if new.data_verified_at is null then
        raise exception 'Confirme a verificação dos dados reais antes de publicar.';
      end if;
      if cardinality(new.photos) = 0 then
        raise exception 'Adicione ao menos uma imagem antes de publicar.';
      end if;
      if current_date not between new.start_date and new.end_date then
        raise exception 'Um evento só pode ficar ativo dentro do período informado.';
      end if;
      if new.pix_copy_paste is null then
        raise exception 'Informe um código Pix copia e cola real antes de publicar.';
      end if;
      if new.type = 'rifa' then
        if not exists (select 1 from public.rifas where event_id = new.id) then
          raise exception 'Configure a rifa antes de publicar.';
        end if;
        select count(*) into prize_count from public.rifa_premios where event_id = new.id;
        if prize_count = 0 then raise exception 'Adicione ao menos um prêmio antes de publicar.'; end if;
      elsif not exists (select 1 from public.produtos where event_id = new.id) then
        raise exception 'Adicione ao menos um produto antes de publicar.';
      end if;
      new.activated_at := coalesce(new.activated_at, now());
      new.ended_at := null;
      new.archived_at := null;
    elsif new.status = 'encerrado' then
      new.ended_at := now();
    elsif new.status = 'arquivado' then
      new.archived_at := now();
    end if;
  end if;
  return new;
end;
$$;
