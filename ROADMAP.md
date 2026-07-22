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

1. Schema Supabase, views públicas, RLS e tipos — `doing` (schema, bucket, tipos gerados e client compartilhado validados no stack local; policies definitivas com Auth/MFA e projeto hospedado pendentes)
2. Auth admin com MFA — `todo`
3. Catálogo público com filtros, ordenação e formulário de adoção — `done` (catálogo e preview da landing leem `caes_public`)
4. CRUD admin; status `disponivel|adotado|falecido` — `doing` (CRUD e Storage funcionam no stack local sem login; Auth/MFA e policies hospedadas pendentes)

## Próxima fase — Histórias

1. Listagem pública responsiva e detalhe expandido — `done`
2. Schema, view pública e RLS — `done`
3. Integração Supabase no frontend — `done` (página pública e preview leem `historias_public`)
4. CRUD admin — `doing` (listagem, busca, formulário, imagens e persistência funcionam no stack local; Auth/MFA e policies hospedadas pendentes)

## Fase — Eventos

1. Listagem e fluxos públicos responsivos de produto e rifa — `done` (dados reais, histórico somente leitura, limites, checkout e confirmação persistida)
2. Schema, views públicas, RLS e verificação de dados reais — `done` (stack local validado; policies admin hospedadas seguem com Auth/MFA)
3. Reserva com Pix real e expiração automática — `done`
4. CRUD admin e gestão de reservas — `done`
5. Formulário alinhado ao schema — `done`
6. Configurações e regras de ciclo — `done`
7. Catálogo de produtos — `done` (múltiplos produtos, opções por unidade, desconto e guia exclusivo por tabela/imagem)
8. Rifas — `done` (prêmios ordenáveis, sorteios persistidos; um número pode ganhar no máximo um prêmio)
9. Ajustes da gestão — `doing` (totais e confirmações assíncronas corrigidos; exclusão auditada exige exportação/envio manual confirmado; envio automático aguarda provedor de e-mail)
10. Testes de Eventos — `done` (38 testes pgTAP para contatos, rascunhos parciais, publicação, conflitos, expiração/liberação, descontos, medidas, ciclo e sorteio; builds/lints dos apps e lint do schema aprovados)

O CRUD de produtos deve permitir um único formato de guia de medidas por produto: tabela preenchida manualmente ou imagem enviada pelo admin.

## Requisito — Eventos

- Ao implementar as telas e o banco, incluir uma verificação que garanta que os dados inseridos sejam reais.
- Permitir ao admin cadastrar e editar um link externo por evento (ex.: pasta do Google Drive com comprovantes de pagamento) e acessá-lo rapidamente na gestão. O link será apenas um atalho; não haverá upload, sincronização ou integração do destino com o sistema.
- Disponibilizar na gestão uma checkbox por reserva para registrar se o respectivo comprovante já foi salvo no destino externo; será apenas um controle administrativo, sem vínculo com arquivos no sistema.
