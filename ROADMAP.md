# ROADMAP.md

1. Fundação — `doing` (Supabase/RLS/auth admin + MFA prontos localmente; projeto hospedado pendente)
2. Landing + Header — `done`
3. Adoção (público + admin) — `doing`
4. Histórias (público + admin) — `doing`
5. Eventos/arrecadação (público + admin + reservas com expiração) — `doing`
6. Configurações admin — `done`
7. Passada final de design system e refinamentos de UI — `todo` **← próxima**

## Fase final — Refinamentos de UI

### Público global

- Header: aumentar altura e tipografia dos botões, aproximando-os do padrão usado nas ações dos cards de gestão.
- Footer: ampliar a logo do Abrigo e os ícones das redes sociais para proporções usuais desses elementos.

### Landing

- Abas do Header sem página própria devem abrir diretamente a seção correspondente da Landing, inclusive quando acionadas em outra rota.
- Aumentar o respiro vertical das seções no mobile, especialmente em “Conheça o abrigo”.

### Adoção pública

- Cards sem imagem devem usar fundo com cor da marca e a logo isolada no lugar da pata genérica.

### Gestão de Cães

- Adotado/Falecido: exibir a confirmação padronizada de Eventos tanto ao arquivar quanto ao tocar novamente para retornar o cão a disponível.
- Formulário de edição: ampliar a galeria para ocupar a largura interna do card, preservando o mesmo recuo das demais seções.
- Padronizar todas as confirmações pelo card usado em Eventos, inclusive Remover.
- Na remoção, sugerir Adotado/Falecido como alternativas mais adequadas e oferecer essas ações na própria confirmação.

### Gestões

- Manter rascunhos no topo em todas as telas; registros publicados ficam abaixo, em ordem alfabética.

### Gestão de Histórias

- Organizar os botões dos cards em duas colunas, seguindo o padrão do componente e o alinhamento à esquerda.
- Ampliar as imagens da galeria de divulgação para facilitar toque e arraste e reduzir remoções acidentais pelo botão X.

## Landing concluída

- Header, Hero, previews de Adoção/Histórias/Recãopensa, Nossos cuidados, Doação, Sobre nós, Voluntários e Footer.
- Primitivos compartilhados: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Icon`, `Logo`, `SelectField` e `Switch`.

## Fase — Adoção

1. Schema Supabase, views públicas, RLS e tipos — `doing` (schema, bucket, tipos, client e policies definitivas validados localmente; projeto hospedado pendente)
2. Auth admin com MFA — `done`
3. Catálogo público com filtros, ordenação e formulário de adoção — `done` (catálogo e preview da landing leem `caes_public`)
4. CRUD admin; status `disponivel|adotado|falecido` — `doing` (CRUD e Storage funcionam atrás de login/MFA no stack local; projeto hospedado pendente)

## Próxima fase — Histórias

1. Listagem pública responsiva e detalhe expandido — `done`
2. Schema, view pública e RLS — `done`
3. Integração Supabase no frontend — `done` (página pública e preview leem `historias_public`)
4. CRUD admin — `doing` (listagem, busca, formulário, imagens e persistência funcionam atrás de login/MFA no stack local; projeto hospedado pendente)

## Fase — Eventos

1. Listagem e fluxos públicos responsivos de produto e rifa — `done` (dados reais, histórico somente leitura, limites, checkout e confirmação persistida)
2. Schema, views públicas, RLS e verificação de dados reais — `done` (stack local e policies admin com MFA validados)
3. Reserva com Pix real e expiração automática — `done`
4. CRUD admin e gestão de reservas — `done`
5. Formulário alinhado ao schema — `done`
6. Configurações e regras de ciclo — `done`
7. Catálogo de produtos — `done` (múltiplos produtos, opções por unidade, desconto e guia exclusivo por tabela/imagem)
8. Rifas — `done` (prêmios ordenáveis, sorteios persistidos; um número pode ganhar no máximo um prêmio)
9. Ajustes da gestão — `doing` (totais e confirmações assíncronas corrigidos; exclusão auditada exige exportação/envio manual confirmado; envio automático aguarda provedor de e-mail)
10. Testes de Eventos — `done` (38 testes pgTAP para contatos, rascunhos parciais, publicação, conflitos, expiração/liberação, descontos, medidas, ciclo e sorteio; builds/lints dos apps e lint do schema aprovados)

O CRUD de produtos deve permitir um único formato de guia de medidas por produto: tabela preenchida manualmente ou imagem enviada pelo admin.

## Fase — Configurações

1. Rota, navegação, listagem responsiva e temas — `done`
2. Valores existentes de Eventos — `done` (limites por reserva, expiração e e-mail de auditoria usam `event_settings`)
3. Modelo global, RLS e hooks — `done`
   - Materializar a fonte única para configurações da Landing e de Cães, com validação de URL, `updated_at`, RLS e leitura pública somente pelos campos necessários.
   - Reutilizar `social_links`/`social_links_public` para redes sociais; não criar estrutura duplicada.
   - Invalidar/revalidar as queries afetadas após salvar para refletir alterações no admin e no site público.
4. Landing Page — `done`
   - Editar e persistir o link de doação; o CTA “Realizar doação” deve consumir esse valor, sem URL hardcoded.
   - Editar e persistir o link do formulário de voluntários; o CTA “Ser um voluntário” deve consumir esse valor.
   - Editar os links de Facebook e Instagram em `social_links`; o Footer deve consumir `social_links_public` e ocultar redes sem URL.
5. Gestão de Cães — `done`
   - Tornar o link global do formulário de adoção a fonte de verdade dos CTAs públicos e dos novos cadastros, eliminando URL hardcoded/duplicada após migration dos dados existentes.
   - Revalidar catálogo de Adoção, preview da Landing e formulário admin após alteração.
6. Gestão de Eventos — `done`
   - Adicionar aos valores padrão os dados de pagamento previstos nos mockups: recebedor, cidade, chave/código Pix e instrução pós-pagamento.
   - Preencher novos eventos com esses padrões, preservando override por evento; checkout e confirmação públicos continuam consumindo o evento persistido.
7. Comportamentos da tela — `done`
   - Habilitar os editores hoje pendentes, reutilizando painel desktop, `Dialog` mobile, campos, ações, validações e estados de carregamento/erro/sucesso existentes.
   - Definir confirmação e fallback para remover/restaurar uma configuração sem deixar CTA público apontando para destino inválido.
8. Login administrativo e MFA/TOTP — `done`
   - Implementar login, sessão e proteção das rotas do admin.
   - Implementar ativação por QR Code, confirmação por código, exigência de `aal2` e remoção segura do autenticador.
9. Validação final — `done` (50 testes pgTAP, smoke test real de login/TOTP/RLS e builds/lints dos apps aprovados)
   - Testar migrations/RLS, hooks, propagação para cada página consumidora, ausência de valores hardcoded, temas, responsividade, teclado/foco e fluxos de MFA.

Critério de conclusão: todo valor salvo em Configurações deve ser a fonte de verdade e aparecer nas páginas relacionadas após revalidação, sem exigir alteração de código ou novo deploy.

## Requisito — Eventos

- Ao implementar as telas e o banco, incluir uma verificação que garanta que os dados inseridos sejam reais.
- Permitir ao admin cadastrar e editar um link externo por evento (ex.: pasta do Google Drive com comprovantes de pagamento) e acessá-lo rapidamente na gestão. O link será apenas um atalho; não haverá upload, sincronização ou integração do destino com o sistema.
- Disponibilizar na gestão uma checkbox por reserva para registrar se o respectivo comprovante já foi salvo no destino externo; será apenas um controle administrativo, sem vínculo com arquivos no sistema.
