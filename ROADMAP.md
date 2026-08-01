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
- `todo` Aplicar a migration `20260726120000`, publicar as Edge Functions e definir `ADMIN_ALLOWED_ORIGINS` no hospedado para ativar o CORS restrito (código vai com fallback `*`).

### P0 — Correções operacionais e mobile

- `todo` Corrigir o CORS de `activate-event`/`delete-archived-event`: aceitar todos os cabeçalhos enviados pelo SDK, validar `OPTIONS` contra a origem hospedada e republicar as funções; hoje o bloqueio do preflight gera `Failed to send a request to the Edge Function`.
- `todo` Padronizar erros de operações administrativas: contrato `{ code, message, requestId }`, status HTTP coerente, log estruturado sem dados sensíveis e tradução no client para rede/CORS, sessão/MFA, validação, conflito, banco, Storage e Resend; manter o diálogo aberto e o rascunho íntegro quando houver falha.
- `done` Corrigir as toolbars mobile de Cães e Histórias para reservar uma linha ao título e impedir colisão com filtro/ação; aplicar `text-marca` aos títulos principais de Cães, Histórias, Eventos e Configurações.
- `done` Exibir Data de início/fim e os demais Objetivos de Eventos em uma coluna nas larguras estreitas, preservando duas colunas a partir de `sm` e o desktop.
- `todo` Auditar os demais grids de duas colunas em 320–430 px sem alterar o desktop.
- `todo` Incluir o admin nos projetos E2E mobile Chromium/WebKit, cobrindo ausência de overflow/sobreposição e publicação de evento com sucesso, falha HTTP, falha de rede/CORS, sessão expirada e falha de exportação.

### P1 — Hardening (auditoria de 2026-07-25)

- `todo` **[Média]** Reserva de rifa trava números enquanto `pendente` (griefing/DoS de estoque): reduzir o TTL e o `max_items_per_reservation` padrão, avaliar verificação humana antes da RPC de reserva e documentar o cancelamento manual como resposta.
- `todo` **[Info]** Confirmar no dashboard hospedado que o signup está desabilitado — `config.toml` não configura produção.
- `todo` **[Info]** Manter os testes pgTAP de superfície das views `*_public` (são `security definer` e ignoram RLS; a proteção é só o `WHERE`); avaliar migrar para `security_invoker`.

Decisões aceitas (não reabrir): timeout de sessão de 7 dias só no client (trade-off do plano Free — ver `PROJECT.md`); débito de contraste AA do coral `#f15a55` (identidade aprovada pelo Abrigo, travado pela suíte E2E nos tokens da marca).

## Primitivos compartilhados

`packages/shared/src/components`: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Header`, `Icon`, `ImageLightbox`, `ImagePlaceholder`, `Logo`, `SelectField`, `Switch`, `TextField`. Antes de criar um componente novo, generalizar um destes (ver `AGENTS.md`, prioridade 3).
