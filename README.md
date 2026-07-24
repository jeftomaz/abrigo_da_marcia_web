# Abrigo da Márcia

Site público e painel administrativo para adoção, histórias, doações e eventos do Abrigo da Márcia.

## Estrutura

- `apps/public`: site para visitantes.
- `apps/admin`: gestão protegida por convite, senha e MFA/TOTP.
- `packages/shared`: componentes, tipos e integrações compartilhados.
- `supabase`: migrations, testes, seed local e Edge Functions.

## Stack

React, Vite, TypeScript, Tailwind CSS, Supabase, TanStack Query, Playwright e pgTAP.

## Desenvolvimento local

Requisitos: Node.js 22, pnpm 9, Docker e Supabase CLI.

```bash
pnpm install
cp .env.example .env
supabase start
supabase db reset
./scripts/dev-local.sh
```

Site público: `http://127.0.0.1:5173`  
Admin: `http://127.0.0.1:5174`

## Validação

```bash
supabase test db
pnpm --filter public lint
pnpm --filter admin lint
pnpm build
pnpm e2e
```

O seed é exclusivamente fictício e nunca deve ser aplicado em produção. O frontend usa somente a Publishable key; toda proteção de dados depende das policies RLS versionadas nas migrations.

## Licença

MIT.
