# ROADMAP.md

Status por fase e pendências abertas. O histórico do que foi feito vive em `PROGRESS.md`.

## Fases

1. Fundação (monorepo, Supabase, RLS, auth + MFA) — `done`
2. Landing + Header — `done`
3. Adoção (público + admin) — `done`
4. Histórias (público + admin) — `done`
5. Eventos/arrecadação (público + admin + reservas) — `done`
6. Configurações admin — `done`
7. Publicação, produção e hardening — `doing` **← atual**

## Pendências abertas

### P0 — Publicação e produção

- `doing` Concluir o smoke hospedado de RLS, Storage, reservas, expiração, sorteio e onboarding por convite; fechar as variáveis finais de produção.
- `todo` Domínio no Resend + `RESEND_FROM_EMAIL` de produção; até lá, envio restrito a `onboarding@resend.dev`.
- `todo` Carregar dados reais (configurações, cães, histórias, eventos, fotos); `seed.sql` é só fictício e não abastece produção.

### P1 — Hardening (auditoria de 2026-07-25)

- `todo` **[Média]** Reserva de rifa trava números enquanto `pendente` (griefing/DoS de estoque): reduzir o TTL e o `max_items_per_reservation` padrão, avaliar verificação humana antes da RPC de reserva e documentar o cancelamento manual como resposta.
- `todo` **[Baixa]** Restringir `expire_event_reservations()` ao evento da chamada — hoje varre `eventos`/`reservas` inteiras no caminho quente da reserva, além do cron de 1 min.
- `todo` **[Baixa]** Restringir o CORS das Edge Functions à origem do admin (hoje `Access-Control-Allow-Origin: *`).
- `todo` **[Info]** Confirmar no dashboard hospedado que o signup está desabilitado — `config.toml` não configura produção.
- `todo` **[Info]** Manter os testes pgTAP de superfície das views `*_public` (são `security definer` e ignoram RLS; a proteção é só o `WHERE`); avaliar migrar para `security_invoker`.

Decisões aceitas (não reabrir): timeout de sessão de 7 dias só no client (trade-off do plano Free — ver `PROJECT.md`); débito de contraste AA do coral `#f15a55` (identidade aprovada pelo Abrigo, travado pela suíte E2E nos tokens da marca).

## Primitivos compartilhados

`packages/shared/src/components`: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Header`, `Icon`, `ImageLightbox`, `ImagePlaceholder`, `Logo`, `SelectField`, `Switch`, `TextField`. Antes de criar um componente novo, generalizar um destes (ver `AGENTS.md`, prioridade 3).
