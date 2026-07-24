# ROADMAP.md

1. Fundação — `doing` (stack local validado; hospedagem e publicação pendentes)
2. Landing + Header — `doing` (estrutura pronta; integrações e conteúdo final pendentes)
3. Adoção (público + admin) — `doing` (fluxos prontos; refinamentos e produção pendentes)
4. Histórias (público + admin) — `doing` (fluxos prontos; refinamentos e produção pendentes)
5. Eventos/arrecadação — `doing` (fluxos principais prontos; lacunas abaixo pendentes)
6. Configurações admin — `doing` (fluxos prontos; card de configurações gerais entregue)
7. Fechamento funcional, design e publicação — `doing` (P0 de publicação pendente; revisão de 2026-07-24 concluída, exceto a edição completa de reservas que aguarda modelo visual) **← atual**

## Pendências abertas — auditoria de 2026-07-22

### P0 — Publicação e dados reais

- `doing` Homologação `banco_site_abrigo` ativa, migrada e validada com bucket, Auth/TOTP, fallback de sessão do plano Free e `pg_cron`; auditoria da produção, URLs e variáveis finais pendentes.
- `doing` Onboarding hospedado por convite implementado (senha → TOTP → `aal2`); recebimento e abertura do e-mail confirmados, conclusão do cadastro no navegador e smoke de RLS, Storage, reservas, expiração e sorteio em andamento.
- `doing` Publicar os apps público e admin no GitHub Pages (bases, admin em `/admin/`, workflow e fallback `404.html` prontos; configuração do Pages, variáveis e publicação pendentes).
- `todo` Comprar/verificar o domínio no Resend e configurar `RESEND_FROM_EMAIL` de produção; até lá, testes de envio ficam restritos ao remetente `onboarding@resend.dev` e ao e-mail da conta Resend.
- `todo` Carregar configurações, cães, histórias, eventos e fotos reais; o `seed.sql` continua exclusivamente fictício e não deve abastecer produção.
- `done` Sanitizar EXIF/GPS e otimizar as fotos versionadas: as 7 fotos `landing_*.jpg` tiveram EXIF/GPS/XMP/maker notes removidos, perfil convertido para sRGB e recompressão q80/2048px via `scripts/optimize-photo.py` (10,2 MB → 3,07 MB). As imagens de `seed-storage/` já eram placeholders gerados (~2,4 KB, sem metadados).

### P1 — Landing, Header e conteúdo público

- `done` Fazer Doação, Sobre nós e Voluntários abrirem a âncora correta da Landing também quando acionados em outra rota.
- `done` Remover o card mockado “Camiseta Copa 2026” e renderizar o preview de Eventos somente com dados reais; sem evento cadastrado/publicável, nenhum card de evento deve aparecer.
- `done` Implementar doação por modalidade e valor: doação única aceita valores predefinidos ou livre e gera o Pix correspondente; recorrente abre o link PagSeguro específico de cada valor, persistido na tela de Configurações.
- `done` Definir largura e altura mínimas para o card de História na Landing em desktops menores, preservando a leitura e mantendo “Conheça essa história” dentro do botão.
- `done` Revisar com o Abrigo textos, fotos, contato, localização e créditos finais; conteúdo atual aprovado, descrição duplicada e Footer corrigidos.
- `done` Remover recursos demonstrativos sem consumidor após integrar o preview: `evento_camiseta.jpg`, `evento_rifa.jpg` e `DEMO_PIX_CODE`.

### P1 — Adoção e Gestão de Cães

- `done` Padronizar imagens ausentes com fundo da marca e logo isolada em cards, diálogos, gestões e formulários.
- `done` Centralizar a única imagem do card público de adoção; aplicar o alinhamento lateral de carrossel somente quando houver mais imagens.
- `done` Manter os filtros da página dedicada de Adoção recolhidos em uma pílula e expandi-los sob clique/toque, com estado e foco acessíveis.
- `done` Confirmar Adotado/Falecido e permitir que a opção ativa retorne o cão a Disponível.
- `done` Trocar a remoção nativa por `Dialog`, sugerindo Adotado/Falecido e oferecendo essas ações antes da exclusão definitiva.
- `done` Ampliar a galeria do formulário desktop para a largura interna do card, mantendo o recuo das demais seções.
- `done` Remover o ícone de informação sem função de “Destacar no catálogo”.

### P1 — Histórias e gestões compartilhadas

- `done` Manter rascunhos de Histórias/Eventos no topo e ordenar os demais registros alfabeticamente.
- `done` Corrigir o componente/layout das ações dos cards de Histórias para manter duas colunas alinhadas à esquerda nos breakpoints previstos.
- `done` Ampliar as miniaturas da galeria de Histórias para facilitar toque/arraste e afastar a ação de remoção.
- `done` Padronizar todas as confirmações com `Dialog`: Cães, Histórias, publicação/verificação de Eventos, limpeza de links e remoção de MFA.
- `done` Exibir mensagens de validação por campo em Cães e Histórias; entradas inválidas por normalização agora explicam o motivo.

### P1 — Eventos e reservas

- `done` Corrigir rótulos provisórios do formulário: “Nova Variação” e “Prêmio da rifa”.
- `done` Disponibilizar “Exportar CSV” também na gestão mobile de reservas.
- `done` Exibir carregamento e erro das reservas no admin, da disponibilidade de números no público e das reservas usadas pela tela de sorteio.
- `doing` Automatizar o envio da exportação com Resend antes da exclusão: Edge Function implementada; remetente de teste, deploy/smoke hospedado e domínio final pendentes.
- `done` Exibir dados persistidos: meta/arrecadado na gestão, identificação Pix na confirmação pública e imagens dos prêmios no detalhe público.
- `done` Revisar os estados de atualização das reservas (salvando, erro e bloqueio por linha) para impedir comandos concorrentes sem retorno visual.

### P2 — Design system e acabamento visual

- `done` Aumentar altura/tipografia das ações do Header e ampliar logo/ícones sociais do Footer.
- `done` Aumentar o respiro vertical das seções da Landing no mobile, especialmente “Conheça o abrigo”.
- `done` Fazer a passada final claro/escuro e mobile/desktop em Landing, Adoção, Histórias, Eventos, Admin, autenticação e Configurações.
- `done` Padronizar estados hover, foco, ativo, desabilitado, carregando, vazio, erro e sucesso de todos os controles interativos.
- `done` **Contraste da marca: débito aceito por decisão de projeto.** O coral `#f15a55` não alcança AA sobre nenhuma superfície do tema — 2,38:1 sobre `marca-clara`, 2,87:1 sobre `marca-escura`, 2,66:1 sobre `cinza-claro` e 3,32:1 até sobre branco puro (AA exige 4,5:1 em texto normal e 3:1 em texto grande), atingindo botões, pílulas do header, títulos e CTAs dos dois apps. Atingir AA exigiria escurecer o coral a `#a43d3a` (32% mais escuro) e mudar a identidade aprovada pelo Abrigo; optou-se por preservá-la. A suíte E2E trava o débito exatamente nesses tokens: qualquer combinação de contraste fora deles reprova, impedindo que se espalhe. Rever se a identidade visual for repactuada.

### P2 — Qualidade, segurança e operação

- `done` Criar rotas de página não encontrada para público e admin e finalizar favicon, descrição, Open Graph e demais metadados de compartilhamento.
- `done` Tornar o seed local autocontido: fotos de Histórias e Eventos carregadas no Storage via seed de bucket do CLI, e fixtures de Eventos (rifa ativa e bazar encerrado) cobrindo reserva, pagamento, cancelamento, entrega e sorteio.
- `done` Adicionar pgTAP específico para Cães, Histórias, views públicas e policies do Storage: 56 testes novos em `caes_historias_test.sql` e `storage_test.sql`, mais 13 do teto por IP em `eventos_test.sql` (126 no total).
- `done` Adicionar testes frontend/E2E dos fluxos críticos e auditoria de acessibilidade por teclado, foco, leitores de tela e contraste: 39 testes Playwright (`pnpm e2e`) em Chromium desktop e WebKit iPhone 12, cobrindo navegação, catálogo, histórias, reserva de rifa ponta a ponta, login com TOTP real e auditoria axe (WCAG 2.1 AA) das páginas públicas e da gestão nos dois temas.
- `done` Medir e reduzir bundles/assets grandes, aplicar carregamento sob demanda por rota e validar desempenho em conexão móvel.
- `done` Definir proteção de borda contra abuso de reservas por IP: triggers em `sessoes_reserva` e `reservas` limitam 60 sessões e 20 reservas por IP/hora, sobre hash com sal.
- `done` Documentar recuperação de acesso em perda do TOTP, backup/restauração e verificação periódica de cron, quotas e auditoria no ambiente hospedado (`OPERATIONS.md`).

## Pendências abertas — revisão de 2026-07-24

Ajustes levantados em uso real, todos anteriores ao lançamento.

### Adoção e Gestão de Cães

- `done` Link do formulário de adoção editável por cão: `caes.adoption_form_url` voltou como override opcional (nullable, CHECK HTTPS), com o global de `site_settings` como padrão dos CTAs.
- `done` "Destacar no catálogo" saiu do formulário e virou ação da listagem, ao lado de Editar/Remover; `useUpdateDogStatus` foi generalizado em `useUpdateDog`.
- `done` Galeria do formulário de Cães perdeu a densidade compacta e passou a usar as mesmas miniaturas de Histórias.

### Configurações e dados compartilhados

- `done` Card "Configurações gerais" reúne o Pix (chave, recebedor, cidade) e as redes sociais; o Pix tem fonte única em `site_settings`, `event_settings` perdeu as colunas de pagamento e os eventos guardam só os três dados com override por evento.
- `done` Pix copia-e-cola gerado no client pela especificação BR Code (EMV MPM) — decidiu-se reusar o gerador próprio (`createPixCode`, valor opcional), sem dependência nova; a coluna `pix_copy_paste` deixou de existir e o código sai já com o valor de cada doação/reserva.

### Eventos — formulário

- `done` "Máx. por reserva" migrou de Objetivos para "Detalhes - Rifa"; nos eventos de produto o campo permanece em Objetivos.
- `done` Meta, quantidade e valor por número se autocompletam (meta = quantidade × valor): preencher dois calcula o terceiro e editar qualquer um recalcula outro.
- `done` "Máx. por reserva" acima da quantidade de números é bloqueado em tempo real e na validação de publicação.

### Eventos — gestão e reservas

- `done` Botão "Exportar CSV" deixou de usar `neutral-adaptive` e passou à variante primária, visível no tema claro.
- `todo` Permitir ao admin editar uma reserva por completo, incluindo os itens que a compõem. **Aguarda o exemplo visual de referência** antes de implementar.
- `done` Listagem ordena o evento ativo no topo e os demais por data de encerramento, do mais recente para o mais antigo.
- `done` Cada card de reserva ganhou atalho para o link dos comprovantes do evento.
- `done` Marcar reserva como paga passa por `Dialog` que pergunta se o comprovante foi salvo, marca a checkbox junto e oferece o atalho para os comprovantes.
- `done` Filtro "Entregues" só aparece quando o evento pode ter reservas entregues (encerrado/arquivado ou já com entrega); a regra do status "Entregue" foi preservada.
- `done` Métrica de itens de evento de produto exibe só a quantidade, sem `/∞`; a rifa mantém `vendidos/total`.
- `done` Arquivar evento exige segunda confirmação (checkbox) destacando que a ação não é reversível.

## Base implementada — Landing

- Header, Hero, previews de Adoção/Histórias/Recãopensa, Nossos cuidados, Doação, Sobre nós, Voluntários e Footer.
- Primitivos compartilhados: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Icon`, `Logo`, `SelectField` e `Switch`.

## Fase — Adoção

1. Schema Supabase, views públicas, RLS e tipos — `doing` (schema, bucket, tipos, client e policies definitivas validados localmente; projeto hospedado pendente)
2. Auth admin com MFA — `done`
3. Catálogo público com filtros, ordenação e formulário de adoção — `done` (catálogo e preview da landing leem `caes_public`)
4. CRUD admin; status `disponivel|adotado|falecido` — `doing` (CRUD e Storage funcionam atrás de login/MFA no stack local; projeto hospedado pendente)

## Fase — Histórias

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
9. Validação final — `done` (53 testes pgTAP locais/remotos, smoke test de login/TOTP/RLS anterior e builds/lints dos apps aprovados; novo onboarding por convite em validação hospedada)
   - Testar migrations/RLS, hooks, propagação para cada página consumidora, ausência de valores hardcoded, temas, responsividade, teclado/foco e fluxos de MFA.

Critério de conclusão: todo valor salvo em Configurações deve ser a fonte de verdade e aparecer nas páginas relacionadas após revalidação, sem exigir alteração de código ou novo deploy.
