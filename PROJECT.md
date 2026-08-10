# PROJECT.md — Site do Abrigo de Cães

## Contexto

Site para abrigo de cães, custo zero. Dois apps: público (visitantes) e admin (gestão). Código será público no GitHub — segurança vive no banco (RLS), nunca no client.

## Stack

- **Host:** GitHub Pages (estático). Domínio canônico em preparação: `https://abrigodamarcia.com.br/`; o endereço padrão `https://jeftomaz.github.io/abrigo_da_marcia_web/` permanece ativo durante a transição. O workflow deriva o prefixo do próprio Pages: público com BrowserRouter + `404.html`, admin em `/admin/` com HashRouter no domínio próprio.
- **Frontend:** React + Vite + TypeScript. Tailwind CSS (tokens do design system em `tailwind.config`).
- **Backend:** Supabase — Postgres (RLS rígido), Auth (MFA TOTP p/ admin), Storage (fotos), `pg_cron` (expiração de reservas).
- **E-mail transacional:** Resend via Supabase Edge Function; credenciais somente em secrets (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).
- **Dados no client:** TanStack Query; client Supabase único e tipado (`database.types.ts` gerado) em `packages/shared`.
- **Monorepo:** pnpm workspaces — `apps/public`, `apps/admin`, `packages/shared`.
- **Dev local do banco:** `supabase start` (requer Docker) sobe o stack; `supabase db reset` aplica `supabase/migrations/` + `supabase/seed.sql`. Studio em `localhost:54323`.
- **Bootstrap local removível:** `./scripts/dev-local.sh` inicia Supabase, público (`5173`) e admin (`5174`). O arquivo não participa de build/deploy.
- **Testes:** `supabase test db` (pgTAP) e `pnpm e2e` (Playwright + axe, em `e2e/`). Os dois exigem `supabase start`; o E2E sobe os apps sozinho e força o Supabase local, ignorando o `.env` da raiz. Primeira execução: `npx playwright install chromium webkit`.
- **Admin:** entrada exclusiva por convite, nome/apelido privado, definição de senha, TOTP obrigatório e RLS condicionada a `app_metadata.role = admin` + `aal2`. Cadastro público permanece desabilitado; convites são enviados pelo Dashboard ou Admin API.

## Regras específicas

- **RLS primeiro:** toda tabela nova nasce com RLS habilitado + policies explícitas. Público lê apenas via views filtradas (`*_public`). Nunca `USING (true)` para anon. Registrar toda policy em `DATA_MODEL.md`.
- **Nunca** commitar `secret key`, `service_role key` ou `.env`. Apenas a `publishable key` no client.
- Componentes de UI compartilhados entre público/admin vivem em `packages/shared` — variações via props/variants, não cópias. **Antes de criar qualquer componente, consultar os existentes** em `packages/shared/src/components` e nos apps (catálogo de primitivos em `ROADMAP.md`); só criar novo se nenhum for compatível ou generalizável (ver AGENTS.md, prioridade 3).
- Strings longas de classes Tailwind: componentizar. Inline apenas para layout pontual (2-4 classes).
- Design system: fidelidade aos mockups Photoshop. Tokens (cores, fontes, radius, spacing) só via `tailwind.config` — nunca valores hardcoded em componente.
- Superfícies 100% brancas no modo claro são sempre 100% pretas no modo escuro; cores de estado e ilustrações não entram nessa correspondência.
- **Fluxo Git:** cada tela/bloco é desenvolvido em branch própria criada a partir da `main` atualizada. Ao finalizar: validar, publicar a branch e **confirmar com o usuário se ela deve ser integrada à `main`**. Se aprovado, mergear, publicar a `main` e criar a branch da próxima parte, se houver.
- Fotos: todo upload usa `compressImage` de `packages/shared` no client e só segue ao Storage com até 500.000 bytes (JPG, PNG ou WebP; preservar a cota free tier). Fotos versionadas no repositório (ex.: `apps/public/src/assets/landing_*.jpg`) não passam por esse client — antes de commitar, rodar `scripts/optimize-photo.py` para remover EXIF/GPS, converter para sRGB e recomprimir.

## Ordem de desenvolvimento

Uma página por vez, nesta ordem (estrutura/funcionalidade primeiro, design fiel depois):

1. Fundação: monorepo, Supabase (schema base + RLS), auth admin + MFA
2. Landing page + Header
3. Adoção (público + admin)
4. Histórias (público + admin)
5. Eventos/arrecadação (público + admin + reservas com expiração)
6. Configurações admin
7. Passada de design system (fidelidade aos mockups)

Status detalhado: `ROADMAP.md`. Operação do ambiente hospedado (perda de TOTP, backup/restauração, cron, quotas e auditoria): `OPERATIONS.md`.

## Funcionalidades por página (resumo)

- **Header:** âncoras da landing + links para páginas dedicadas.
- **Landing:** seções horizontais (doação, adoção, histórias etc.).
- **Doação:** modalidade única gera Pix copia-e-cola por valor predefinido ou livre; modalidade recorrente abre o link PagSeguro específico do valor configurado no admin.
- **Adoção:** catálogo de cards expansíveis; ordenação por porte/idade; botão → Google Forms. Admin: CRUD de cães; status `disponivel|adotado|falecido` (≠ disponível some do público).
- **Histórias:** exibição de adoções concluídas. Admin: CRUD e publicação/rascunho.
- **Eventos:** no máximo 1 ativo + 3 encerrados; rascunhos não contam. Ao publicar o quinto, o evento com `activated_at` mais antigo é exportado por e-mail e excluído antes da ativação; falha no envio preserva tudo. O admin também pode excluir um evento encerrado pelo mesmo fluxo de exportação e auditoria. Usuário reserva produto/número de rifa → recebe código Pix → envia comprovante fora do site (WhatsApp/Instagram) → admin marca como pago. Reserva expira automaticamente (prazo definido pelo admin) e item volta ao catálogo.
- **Configurações:** valores padrão compartilhados pelas gestões; links públicos e segurança/MFA entram conforme seus modelos de dados forem implementados.

## Sessão admin

Refresh token longo (padrão Supabase). A sessão é encerrada no client após 7 dias sem atividade, controlados por `abrigo-admin-last-activity-at`; o próximo acesso exige senha e novo desafio TOTP. `auth.sessions.inactivity_timeout` permanece desabilitado no Supabase Free porque exige plano Pro.

A recuperação por e-mail e a troca de senha em Configurações exigem um novo código TOTP antes de aceitar a nova senha. O link de recuperação nunca permite cadastrar ou substituir o autenticador.

Para provisionar um admin local ou hospedado: convidar a conta pelo Studio/Dashboard ou Admin API. O banco atribui `app_metadata.role = admin` somente a usuários convidados; o link exige nome/apelido, definição de senha e cadastro do TOTP antes de liberar a gestão. Admins legados sem `admin_profiles` completam o perfil uma vez após o MFA. Nenhuma credencial administrativa vive no repositório.
