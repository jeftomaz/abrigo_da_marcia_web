# PROJECT.md — Site do Abrigo de Cães

## Contexto

Site para abrigo de cães, custo zero. Dois apps: público (visitantes) e admin (gestão). Código será público no GitHub — segurança vive no banco (RLS), nunca no client.

## Stack

- **Host:** GitHub Pages (estático). Público: BrowserRouter + truque `404.html`. Admin: HashRouter.
- **Frontend:** React + Vite + TypeScript. Tailwind CSS (tokens do design system em `tailwind.config`).
- **Backend:** Supabase — Postgres (RLS rígido), Auth (MFA TOTP p/ admin), Storage (fotos), `pg_cron` (expiração de reservas).
- **Dados no client:** TanStack Query; client Supabase único e tipado (`database.types.ts` gerado) em `packages/shared`.
- **Monorepo:** pnpm workspaces — `apps/public`, `apps/admin`, `packages/shared`.
- **Dev local do banco:** `supabase start` (requer Docker) sobe o stack; `supabase db reset` aplica `supabase/migrations/` + `supabase/seed.sql`. Studio em `localhost:54323`.

## Regras específicas

- **RLS primeiro:** toda tabela nova nasce com RLS habilitado + policies explícitas. Público lê apenas via views filtradas (`*_public`). Nunca `USING (true)` para anon. Registrar toda policy em `DATA_MODEL.md`.
- **Nunca** commitar `service_role key` ou `.env`. Apenas `anon key` no client.
- Componentes de UI compartilhados entre público/admin vivem em `packages/shared` — variações via props/variants, não cópias. **Antes de criar qualquer componente, consultar os existentes** em `packages/shared/src/components` e nos apps (catálogo de primitivos em `ROADMAP.md`); só criar novo se nenhum for compatível ou generalizável (ver AGENTS.md, prioridade 3).
- Strings longas de classes Tailwind: componentizar. Inline apenas para layout pontual (2-4 classes).
- Design system: fidelidade aos mockups Photoshop. Tokens (cores, fontes, radius, spacing) só via `tailwind.config` — nunca valores hardcoded em componente.
- Superfícies 100% brancas no modo claro são sempre 100% pretas no modo escuro; cores de estado e ilustrações não entram nessa correspondência.
- **Fluxo Git:** cada tela é desenvolvida em branch própria criada a partir da `main` atualizada. Ao finalizar, validar, publicar a branch, integrá-la à `main` e publicar a `main` antes de iniciar a próxima tela.
- Fotos: comprimir no client antes do upload (preservar cota do Storage free tier).

## Ordem de desenvolvimento

Uma página por vez, nesta ordem (estrutura/funcionalidade primeiro, design fiel depois):

1. Fundação: monorepo, Supabase (schema base + RLS), auth admin + MFA
2. Landing page + Header
3. Adoção (público + admin)
4. Histórias (público + admin)
5. Eventos/arrecadação (público + admin + reservas com expiração)
6. Passada de design system (fidelidade aos mockups)

Status detalhado: `ROADMAP.md`.

## Funcionalidades por página (resumo)

- **Header:** âncoras da landing + links para páginas dedicadas.
- **Landing:** seções horizontais (doação, adoção, histórias etc.).
- **Adoção:** catálogo de cards expansíveis; ordenação por porte/idade; botão → Google Forms. Admin: CRUD de cães; status `disponivel|adotado|falecido` (≠ disponível some do público).
- **Histórias:** exibição de adoções concluídas. Admin: CRUD.
- **Eventos:** 1 evento ativo + histórico. Usuário reserva produto/número de rifa → recebe código Pix → envia comprovante fora do site (WhatsApp/Instagram) → admin marca como pago. Reserva expira automaticamente (prazo definido pelo admin) e item volta ao catálogo. Admin: CRUD de eventos, produtos, rifas, prazos.

## Sessão admin

Refresh token longo (padrão Supabase). Exigir novo desafio MFA (`aal2`) apenas se sessão expirou ou inatividade > N dias (checagem via `last_activity_at`).
