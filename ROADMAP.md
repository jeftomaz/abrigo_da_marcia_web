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

- `todo` Criar o projeto Supabase hospedado, aplicar migrations/bucket e configurar URLs, Auth, TOTP, sessão, `pg_cron` e variáveis de produção.
- `todo` Provisionar o primeiro admin hospedado e repetir o smoke test de login, `aal2`, RLS, Storage, reservas, expiração e sorteio no ambiente real.
- `todo` Publicar os apps público e admin no GitHub Pages: definir caminhos/base, domínio do admin, workflow de build/deploy e fallback `404.html` do `BrowserRouter`.
- `todo` Carregar configurações, cães, histórias, eventos e fotos reais; o `seed.sql` continua exclusivamente fictício e não deve abastecer produção.
- `todo` Sanitizar EXIF/GPS e otimizar as fotos versionadas antes da publicação; há assets com metadados de aparelho, data e localização.

### P1 — Landing, Header e conteúdo público

- `todo` Fazer Doação, Sobre nós e Voluntários abrirem a âncora correta da Landing também quando acionados em outra rota.
- `todo` Substituir o card fixo “Camiseta Copa 2026” e sua descrição placeholder pelo evento ativo real, com estado alternativo quando não houver evento.
- `todo` Dar efeito real aos seletores de valor/recorrência da doação no destino configurado ou removê-los; hoje só alteram estado visual, mesmo sem CTA, e o link abre sempre a mesma URL.
- `todo` Revisar com o Abrigo textos, fotos, contato, localização e créditos finais; corrigir a descrição duplicada de vacinação em “Tratamento contra carrapatos” e o símbolo/ano fixo `® 2026` do Footer.
- `todo` Remover recursos demonstrativos sem consumidor após integrar o preview: `evento_camiseta.jpg`, `evento_rifa.jpg` e `DEMO_PIX_CODE`.

### P1 — Adoção e Gestão de Cães

- `todo` Usar fundo da marca e logo isolada nos cards/diálogos sem foto, em vez da pata genérica.
- `todo` Confirmar Adotado/Falecido e permitir que a opção ativa retorne o cão a Disponível.
- `todo` Trocar a remoção nativa por `Dialog`, sugerindo Adotado/Falecido e oferecendo essas ações antes da exclusão definitiva.
- `todo` Ampliar a galeria do formulário desktop para a largura interna do card, mantendo o recuo das demais seções.
- `todo` Implementar explicação acessível para o ícone de informação de “Destacar no catálogo” ou remover o ícone sem função.

### P1 — Histórias e gestões compartilhadas

- `todo` Manter rascunhos de Histórias/Eventos no topo e ordenar os demais registros alfabeticamente; as queries atuais usam criação ou ordem não explícita.
- `todo` Organizar as ações dos cards de Histórias em duas colunas alinhadas à esquerda.
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
9. Validação final — `done` (50 testes pgTAP, smoke test real de login/TOTP/RLS e builds/lints dos apps aprovados)
   - Testar migrations/RLS, hooks, propagação para cada página consumidora, ausência de valores hardcoded, temas, responsividade, teclado/foco e fluxos de MFA.

Critério de conclusão: todo valor salvo em Configurações deve ser a fonte de verdade e aparecer nas páginas relacionadas após revalidação, sem exigir alteração de código ou novo deploy.
