# ROADMAP.md

1. Fundação — `doing` (scaffold monorepo pronto; Supabase/RLS/auth admin adiados p/ quando Adoção começar)
2. Landing + Header — `doing` **← FASE ATUAL** (ver detalhe abaixo)
3. Adoção (público + admin) — `todo`
4. Histórias (público + admin) — `todo`
5. Eventos/arrecadação (público + admin + reservas com expiração) — `todo`
6. Passada de design system (fidelidade aos mockups) — `todo` (fidelidade já sendo aplicada por página conforme construída, ver PROGRESS.md)

## Fase atual — Landing por seções

Construção da Landing **uma seção por vez**. Ciclo por seção (não pular etapas):
1. Usuário fornece mockup (desktop+mobile, light+dark) + conteúdo real da seção.
2. Implementar com fidelidade visual total já na 1ª versão (tokens do `@theme`, nunca hardcoded).
3. Validar visualmente via screenshot headless (light/dark, desktop/mobile) antes de marcar `done`.
4. Atualizar este arquivo + `PROGRESS.md`.

Seções (status):
- Header — `done` (compartilhado, `packages/shared`)
- Hero — `done` (`apps/public/src/components/Hero.tsx`)
- Doação (`#doacao`, âncora) — `todo`
- Sobre nós (`#sobre-nos`, âncora) — `todo`
- Voluntários (`#voluntarios`, âncora) — `todo`
- Preview Adoção (`/adocao`) — `done` (`apps/public/src/components/AdocaoPreview.tsx`)
- Preview Histórias (`/historias`) — `done` (`apps/public/src/components/HistoriasPreview.tsx`)
- Preview/CTA p/ Recãopensa (`/eventos`) — `todo`
- Footer — `todo`

Lista/ordem exatas das seções a confirmar conforme os mockups chegarem (âncoras acima são as já fixadas no Header). Rotas dedicadas apontadas pelo Header só ganham página real nas fases 3-5.

**Ao encerrar a Fase 2:** compactar os registros (`ROADMAP.md`, `PROGRESS.md`) p/ economia de tokens — colapsar o detalhe de seções concluídas em 1-2 linhas — e então expandir o detalhe da próxima fase.
