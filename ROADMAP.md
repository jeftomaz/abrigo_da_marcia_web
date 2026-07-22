# ROADMAP.md

1. Fundação — `doing` (stack local validado; hospedagem e publicação pendentes)
2. Landing + Header — `doing` (estrutura pronta; integrações e conteúdo final pendentes)
3. Adoção (público + admin) — `doing` (fluxos prontos; refinamentos e produção pendentes)
4. Histórias (público + admin) — `doing` (fluxos prontos; refinamentos e produção pendentes)
5. Eventos/arrecadação — `doing` (fluxos principais prontos; lacunas abaixo pendentes)
6. Configurações admin — `done`
7. Fechamento funcional, design e publicação — `todo` **← próxima**

## Pendências abertas — auditoria de 2026-07-22

### P0 — Publicação e dados reais

- `doing` Homologação `banco_site_abrigo` ativa, migrada e validada com bucket, Auth/TOTP, fallback de sessão do plano Free e `pg_cron`; auditoria da produção, URLs e variáveis finais pendentes.
- `doing` Onboarding hospedado por convite implementado (senha → TOTP → `aal2`); recebimento e abertura do e-mail confirmados, conclusão do cadastro no navegador e smoke de RLS, Storage, reservas, expiração e sorteio em andamento.
- `doing` Publicar os apps público e admin no GitHub Pages (bases, admin em `/admin/`, workflow e fallback `404.html` prontos; configuração do Pages, variáveis e publicação pendentes).
- `todo` Carregar configurações, cães, histórias, eventos e fotos reais; o `seed.sql` continua exclusivamente fictício e não deve abastecer produção.
- `todo` Sanitizar EXIF/GPS e otimizar as fotos versionadas antes da publicação; há assets com metadados de aparelho, data e localização.

### P1 — Landing, Header e conteúdo público

- `done` Fazer Doação, Sobre nós e Voluntários abrirem a âncora correta da Landing também quando acionados em outra rota.
- `done` Remover o card mockado “Camiseta Copa 2026” e renderizar o preview de Eventos somente com dados reais; sem evento cadastrado/publicável, nenhum card de evento deve aparecer.
- `done` Implementar doação por modalidade e valor: doação única aceita valores predefinidos ou livre e gera o Pix correspondente; recorrente abre o link PagSeguro específico de cada valor, persistido na tela de Configurações.
- `todo` Definir largura e altura mínimas para o card de História na Landing em desktops menores, preservando a leitura e mantendo “Conheça essa história” dentro do botão.
- `todo` Revisar com o Abrigo textos, fotos, contato, localização e créditos finais; corrigir a descrição duplicada de vacinação em “Tratamento contra carrapatos” e o símbolo/ano fixo `® 2026` do Footer.
- `done` Remover recursos demonstrativos sem consumidor após integrar o preview: `evento_camiseta.jpg`, `evento_rifa.jpg` e `DEMO_PIX_CODE`.

### P1 — Adoção e Gestão de Cães

- `done` Padronizar imagens ausentes com fundo da marca e logo isolada em cards, diálogos, gestões e formulários.
- `done` Centralizar a única imagem do card público de adoção; aplicar o alinhamento lateral de carrossel somente quando houver mais imagens.
- `done` Manter os filtros da página dedicada de Adoção recolhidos em uma pílula e expandi-los sob clique/toque, com estado e foco acessíveis.
- `done` Confirmar Adotado/Falecido e permitir que a opção ativa retorne o cão a Disponível.
- `todo` Trocar a remoção nativa por `Dialog`, sugerindo Adotado/Falecido e oferecendo essas ações antes da exclusão definitiva.
- `todo` Ampliar a galeria do formulário desktop para a largura interna do card, mantendo o recuo das demais seções.
- `todo` Implementar explicação acessível para o ícone de informação de “Destacar no catálogo” ou remover o ícone sem função.

### P1 — Histórias e gestões compartilhadas

- `todo` Manter rascunhos de Histórias/Eventos no topo e ordenar os demais registros alfabeticamente; as queries atuais usam criação ou ordem não explícita.
- `todo` Corrigir o componente/layout das ações dos cards de Histórias para manter duas colunas alinhadas à esquerda nos breakpoints previstos; a gestão ainda as apresenta em uma única coluna.
- `todo` Ampliar as miniaturas da galeria de Histórias para facilitar toque/arraste e afastar a ação de remoção.
- `todo` Padronizar os `window.confirm` restantes com o `Dialog` de Eventos: Cães, Histórias, publicação/verificação de Eventos, limpeza de links e remoção de MFA.
- `todo` Exibir mensagens de validação por campo em Cães e Histórias; entradas inválidas por normalização hoje podem apenas impedir o envio sem explicar o motivo.

### P1 — Eventos e reservas

- `todo` Corrigir rótulos provisórios do formulário: “Nova Opção” cria uma nova variação e o diálogo de prêmio ainda exibe o título genérico “Seção”.
- `todo` Disponibilizar “Exportar CSV” também na gestão mobile de reservas.
- `todo` Exibir carregamento e erro das reservas no admin, da disponibilidade de números no público e das reservas usadas pela tela de sorteio; falhas hoje parecem listas vazias.
- `todo` Automatizar o envio da exportação antes de excluir evento arquivado após escolher um provedor de e-mail; até lá, corrigir a Configuração que afirma que exportações já são “enviadas”.
- `todo` Definir e implementar onde aparecem os dados já persistidos mas sem consumidor final: meta/progresso de arrecadação, chave/recebedor/cidade Pix e imagens dos prêmios.
- `todo` Revisar os estados de atualização das reservas (salvando, erro e bloqueio por linha) para impedir comandos concorrentes sem retorno visual.

### P2 — Design system e acabamento visual

- `todo` Aumentar altura/tipografia das ações do Header e ampliar logo/ícones sociais do Footer.
- `todo` Aumentar o respiro vertical das seções da Landing no mobile, especialmente “Conheça o abrigo”.
- `todo` Fazer a passada final claro/escuro e mobile/desktop em Landing, Adoção, Histórias, Eventos, Admin, autenticação e Configurações.
- `todo` Padronizar estados hover, foco, ativo, desabilitado, carregando, vazio, erro e sucesso de todos os controles interativos.

### P2 — Qualidade, segurança e operação

- `todo` Criar rotas de página não encontrada para público e admin e finalizar favicon, descrição, Open Graph e demais metadados de compartilhamento.
- `todo` Tornar o seed local autocontido: remover caminhos de fotos inexistentes ou carregar os arquivos no Storage e incluir fixtures de Eventos para validar os fluxos completos.
- `todo` Adicionar pgTAP específico para Cães, Histórias, views públicas e policies do Storage; os testes atuais concentram Eventos e Configurações.
- `todo` Adicionar testes frontend/E2E dos fluxos críticos e auditoria de acessibilidade por teclado, foco, leitores de tela e contraste.
- `todo` Medir e reduzir bundles/assets grandes, aplicar carregamento sob demanda por rota e validar desempenho em conexão móvel.
- `todo` Definir proteção de borda contra abuso de reservas por IP; a limitação atual é somente por sessão do navegador.
- `todo` Documentar recuperação de acesso em perda do TOTP, backup/restauração e verificação periódica de cron, quotas e auditoria no ambiente hospedado.

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
