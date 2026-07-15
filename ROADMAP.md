# ROADMAP.md

1. Fundação — `doing` (scaffold pronto; Supabase/RLS/auth admin entram com Adoção)
2. Landing + Header — `done`
3. Adoção (público + admin) — `doing`
4. Histórias (público + admin) — `doing`
5. Eventos/arrecadação (público + admin + reservas com expiração) — `doing` **← atual**
6. Passada final de design system — `todo`

## Landing concluída

- Header, Hero, previews de Adoção/Histórias/Recãopensa, Nossos cuidados, Doação, Sobre nós, Voluntários e Footer.
- Primitivos compartilhados: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Icon`, `Logo`, `SelectField` e `Switch`.

## Fase — Adoção

1. Schema Supabase, views públicas, RLS e tipos — `doing` (migrations de `caes`/`social_links` + views + RLS materializadas e validadas no stack local; tipos, client Supabase, policies admin e projeto hospedado pendentes)
2. Auth admin com MFA — `todo`
3. Catálogo público com filtros, ordenação e formulário de adoção — `doing` (interface pronta com dados temporários; integração Supabase pendente)
4. CRUD admin; status `disponivel|adotado|falecido` — `todo`

## Próxima fase — Histórias

1. Listagem pública responsiva e detalhe expandido — `done` (dados temporários)
2. Schema, view pública e RLS — `done`
3. Integração Supabase no frontend — `todo`
4. CRUD admin — `todo`

## Fase — Eventos

1. Listagem pública e fluxos responsivos de produto e rifa (cards, seleções, checkout e confirmação) — `done` (dados temporários; Pix demonstrativo)
2. Schema, views públicas, RLS e verificação de dados reais — `todo`
3. Persistência da reserva com Pix real e expiração automática — `todo`
4. CRUD admin — `todo`

## Requisito — Eventos

- Ao implementar as telas e o banco, incluir uma verificação que garanta que os dados inseridos sejam reais.
