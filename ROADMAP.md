# ROADMAP.md

Status por fase e pendências abertas. O histórico do que foi feito vive em `PROGRESS.md`.

## Fases

1. Fundação (monorepo, Supabase, RLS, auth + MFA) — `done`
2. Landing + Header — `done`
3. Adoção (público + admin) — `done`
4. Histórias (público + admin) — `done`
5. Eventos/arrecadação (público + admin + reservas) — `done`
6. Configurações admin — `done`
7. Publicação, produção e hardening — `doing`
8. Cuidados e prontuários dos cães (admin) — `doing` **← atual**

## Pendências abertas

### P0 — Cuidados e prontuários dos cães

Executar antes da carga real dos cães para que o painel seja a fonte única dos dados desde o início.

- `done` **Bloco 1 — fundação privada.** Catálogo flexível de itens, programas para todos/cães selecionados, atribuições individuais, registros realizados, automação para cães atuais/futuros, autoria, RLS + MFA e pgTAP.
- `doing` **Bloco 2 — aba Cuidados.** Nova rota administrativa com Agenda, Programas e busca por cão; cadastro de itens no próprio fluxo, sem listas fechadas no client. Incluir a tranca que impede ativar programa enquanto o item é desativado.
- `todo` **Bloco 3 — integração com Cães.** Abrir o prontuário a partir da gestão atual e registrar adoções, devoluções e demais mudanças de status em transação, sem alterar `caes_public`. Serializar a atualização do resumo do cuidado ao registrar ocorrências concorrentes.
- `todo` **Bloco 4 — impressão.** Carteirinha A4 sem notas internas e prontuário administrativo completo, com cobertura E2E mobile/desktop.

### P0 — Publicação e produção

- `doing` Configurar `abrigodamarcia.com.br`: build adaptativo e runbook prontos; faltam DNS avançado, domínio no Pages, URLs de Auth, HTTPS e smoke após a propagação.
- `done` Aplicar no hospedado as migrations de `20260726120000` a `20260805130000`, após backup completo do banco e Storage.
- `done` Aplicar no hospedado as migrations de `20260809120000` a `20260810214700`, que atualizam reservas/rifas, restauram o fluxo encerrado → arquivado → exclusão auditada e restringem a confirmação da exportação ao backend.
- `done` Definir `ADMIN_ALLOWED_ORIGINS`, publicar `activate-event` e `delete-archived-event` e validar CORS permitido/negado no hospedado.
- `done` Republicar `delete-archived-event`, validar CORS e confirmar a rejeição de chamadas sem sessão no hospedado.
- `done` Conferir `RESEND_API_KEY`/`RESEND_FROM_EMAIL` antes do smoke de exportação.
- `doing` Concluir o smoke hospedado com fixtures temporárias: views/RLS, Storage, convite + TOTP/AAL2, reservas, expiração via cron, sorteio, exportação e preservação em falhas; remover contas, registros e arquivos de teste ao final.
- `todo` Verificar o domínio no Resend (SPF/DKIM), definir o remetente definitivo e validar a exportação por e-mail; até lá, o envio permanece restrito a `onboarding@resend.dev`.
- `todo` Carregar pelo admin os dados reais na ordem: configurações/links/Pix, cães, histórias e eventos/fotos; `seed.sql` permanece exclusivamente fictício e fora da produção.
- `todo` Revisar produção em mobile/desktop, conferir links e Pix com uma operação pequena e gerar novo backup completo após a carga real.

### P0 — Consistência estrutural (diagnóstico de 2026-08-16)

Causa dos ajustes que quebravam recursos prontos: as regras de arquitetura viviam só em prosa, sem nada que falhasse quando violadas. Fases em ordem de alavancagem, uma branch cada.

- `done` **Fase 1 — travas automáticas.** CI passou a rodar lint, build, pgTAP e E2E, e o deploy só publica com tudo verde; `scripts/check-classes.mjs` barra `!` em `className` e breakpoint arbitrário por catraca sobre a base herdada; suíte zerada (QR Pix).
- `done` **Fase 2a — tema compartilhado.** `packages/shared/src/theme.css` passou a ser a fonte única de fontes, cores e breakpoints; cada `index.css` ficou só com o que é exclusivo do app. Mudança visual zero, comprovada por diff do CSS gerado.
- `todo` **Fase 2b — escala tipográfica no admin.** Os 15 tokens `--text-*` fluidos seguem só no público; o admin usa `text-sm` 93×, `text-3xl` 46× e `text-2xl` 29× caindo no padrão do Tailwind, fora da escala da marca. A divergência é ativa, não teórica: `Action` (21 arquivos do admin, 12 do público) define `text-sm` no `size="small"`, então o mesmo botão mede 14 px fixos no admin e 11,9–16,1 px fluidos no público. Mover para o tema compartilhado muda a tipografia do admin — exige passada visual em 320/393/1024/1920 px, claro e escuro.
- `done` **Fase 3 — escala de breakpoints.** Os 4 pontos arbitrários viraram `galeria`/`linha`/`acoes` no tema, e `min-[48rem]` virou `md` (mesmo valor do Tailwind). Base de `breakpoint` no `check-classes` zerada: a escala agora é fechada. CSS gerado idêntico exceto pelos nomes das classes.
  - Container query no `CompactCard` foi descartada: a premissa era que ele quebrava dentro do admin, mas `CompactCard`, `ExpandedCardDialog`, `FeatureSection`, `Header` e `SelectField` — todos os compartilhados com `lg:` — só são renderizados no público. O descasamento `lg`/`desk` é armadilha latente, não bug ativo; migrar seria mudança visual sem problema a resolver. Reabrir só se algum deles for para o admin.
- `done` **Fase 4 — remover duplicação.** `CardGrid` substituiu as 4 cópias da grade (variantes `page` e `preview`); `Action` ganhou os tamanhos `admin-row`, `admin-row-event` e `admin-inline`, e `gap` saiu do `BASE_CLASSES` — era ele que obrigava o consumidor ao `!`. A grade pública e a proporção dos cards ganharam 8 testes E2E nas 4 superfícies. Catraca de `important` caiu de 58 para 27.
### P1 — Reuso visual e eficiência (medição de 2026-08-23)

Quatro pontos onde o padrão do projeto não chegou e a duplicação é medida, não hipotética. Uma branch cada.

- `done` **Bloco 1 — forma terciária no `Action`.** Os 3 links de texto sublinhado viraram `ghost` + `link`/`link-small`. Botões de ícone e chips `aria-pressed` ficaram fora **por decisão medida** (ver `UI_CONTRACTS.md`), o que mantém 26 dos 29 `<button>` crus — legítimos, não pendência.
- `todo` **Bloco 2 — slots no `ConfirmationDialog`.** O componente é usado em 4 lugares e **contornado em outros 4** (`Caes` ×2, `Historias`, `Eventos`), que refazem o esqueleto com `<Dialog>` direto porque falta subtítulo, erro, largura e ações alternativas. Absorver os 4 forks com `subtitle`, `error`, `description` em array, `size` (`default`/`wide`, este preservando a tipografia maior de Eventos) e um slot `children` para as ações extras.
- `todo` **Bloco 3 — `AdminToolbar`.** Busca, filtro e ação são idênticos byte a byte entre `Caes.tsx` e `Historias.tsx`. `Eventos` não tem toolbar e fica fora. Não usar `SelectField` (tem `lg:`, e o admin vira em `desk`); o botão precisa de um `ActionSize` real — o `className="px-3"` de hoje é no-op contra o `px-6` do `small`.
- `todo` **Bloco 4 — políticas de cache nomeadas.** 7 hooks repetem `refetchInterval: 5_000`; a landing monta 5 chaves e gera ~3.600 requisições/hora por aba, contra a restrição de custo zero. Separar `CACHE_ESTATICO` (cães, histórias, configurações, redes) de `CACHE_AO_VIVO` (números de rifa e reservas, onde os 5s servem à disputa de estoque).

- `todo` Dar variante ao `OptionToggle` para zerar os 15 `!important` restantes: não são contrato do `Action` — `DogRow` (6) e `StoryRow` (9) sobrescrevem os botões internos do `OptionToggle`. O `Logo` saiu deste item: nunca foi a causa, seu SVG já usa `currentColor`.
- `done` **Fase 5 — contrato de UI.** `UI_CONTRACTS.md` reúne variantes, o que não se sobrescreve e as decisões vinculantes, que saíram do log do `PROGRESS.md`. `AGENTS.md` passa a pedir `DATA_MODEL.md` só em tarefa de dados e `UI_CONTRACTS.md` só em tarefa de interface.

### P0 — Correções operacionais e mobile

- `done` Manter o painel de edição de Configurações junto ao header no desktop, com rolagem própria quando exceder a altura visível.
- `done` Alinhar tamanho e grade dos cards de Histórias na landing ao padrão dos cards de Adoção.
- `done` Fixar nome e tags nos cards expandidos de Adoção e Histórias, limitando a rolagem à descrição e reduzindo sua tipografia no mobile.
- `done` Alinhar o QR Pix mobile ao contrato E2E: passou a 192 px em qualquer largura.
- `done` Padronizar tamanho, espaçamento, alinhamento e breakpoint das abas nos headers público e administrativo.
- `done` Exibir feedback visual durante processamento e envio de imagens nos formulários administrativos de Cães, Histórias e Eventos.
- `done` Corrigir o cadastro de Eventos: impedir sobreposição dos Objetivos, exibir e exigir o prazo de reserva configurado, manter a meta fixa no equilíbrio da rifa e compactar o card Pix para preservar a ação de fechar.
- `done` CORS de `activate-event`/`delete-archived-event` corrigido e coberto por E2E: aceita os cabeçalhos do SDK e rejeita origens não permitidas; implantação é acompanhada no P0 de produção.
- `done` Erros administrativos padronizados: contrato `{ code, message, requestId }`, status HTTP coerente, log estruturado sem dados sensíveis e tradução compartilhada no client para rede/CORS, sessão/MFA, validação, conflito, banco, Storage e Resend; diálogos e rascunhos permanecem íntegros na falha.
- `done` Corrigir as toolbars mobile de Cães e Histórias para reservar uma linha ao título e impedir colisão com filtro/ação; aplicar `text-marca` aos títulos principais de Cães, Histórias, Eventos e Configurações.
- `done` Compactar os cards mobile de Cães e Histórias, mantendo foto/nome e ações lado a lado entre 320–430 px sem remover controles ou autoria.
- `done` Organizar os Objetivos de Eventos conforme os mockups: datas e arrecadação na mesma linha, regras adicionais abaixo e nenhum transbordamento entre 320 px e o desktop.
- `done` Auditar os demais grids de duas colunas em 320–430 px sem alterar o desktop.
- `done` Incluir o admin nos projetos E2E mobile Chromium/WebKit, cobrindo ausência de overflow/sobreposição e publicação de evento com sucesso, falha HTTP, falha de rede/CORS, sessão expirada e falha de exportação.
- `done` Remover as margens laterais dos menus roláveis no mobile e reduzir a ênfase do botão de fechar no diálogo Pix.
- `done` Implementar “Esqueci a senha” e troca de senha em Configurações, ambos com confirmação TOTP antes da nova senha.
- `done` Exibir os requisitos da senha em tempo real; ampliar números/valor na conferência da rifa; destacar Reservas abertas, oferecer a pasta de comprovantes na confirmação de pagamento, alertar quando faltarem reservas pagas para os prêmios e limitar cada reserva a um prêmio por rifa.
- `done` Exigir no admin o fluxo ativo → encerrado → arquivado → excluído; a exportação por e-mail e a auditoria continuam obrigatórias na exclusão.
- `done` Validar recuperação/troca de senha no E2E local; a repetição hospedada permanece incluída no smoke de produção.
- `done` Levar a navegação pública e administrativa para a base no mobile, confirmar logout e pagamento após comprovante, oferecer colagem do TOTP e destacar o limite de números da rifa.
- `done` Centralizar a pasta de comprovantes por evento, identificar reservas por código hexadecimal copiável e compactar o sorteio mobile; a esfera inteira também aciona o sorteio por clique, toque ou teclado.
- `done` Exigir ao menos dois nomes em reservas, com feedback imediato no público e proteção de banco para criação e edição administrativa.
- `done` Após o sorteio da rifa, levar as reservas ganhadoras ao topo da gestão e destacá-las visualmente para os admins.
- `done` Tornar o celular o contato principal das reservas e substituir o switch por ações textuais reversíveis entre celular e e-mail.
- `done` Aplicar a paleta da marca ao destaque dos ganhadores e exibir os prêmios da rifa em carrossel horizontal no evento público.
- `done` Exibir ao público somente os números sorteados e manter os nomes dos ganhadores restritos ao admin.

### P1 — Segurança e integridade

Executar em branches separadas após os blocos funcionais de Cuidados e antes da carga real/smoke final. As duas correções do domínio de Cuidados entram nos próprios Blocos 2 e 3 para não construir a nova gestão sobre invariantes concorrentes.

- `todo` **Bloco 1 — persistência atômica de eventos [Alta].** Substituir as gravações relacionais sequenciais por RPC idempotente em uma transação; imagens novas só podem ser removidas após confirmar que não são referenciadas, e imagens antigas são limpas depois do commit. Cobrir falha em cada etapa e resposta perdida após commit.
- `todo` **Bloco 2 — contenção de abuso em reservas [Alta].** Serializar o contador por hash de IP e persistir também tentativas inválidas ou conflitantes sem deixar alterações parciais na reserva. Cobrir chamadas paralelas, sessões diferentes e falhas de validação.
- `todo` **Bloco 3 — contratos de input no banco [Média].** Definir limites de negócio e aplicá-los a nome de reserva, ano de nascimento, textos/coleções/JSON de eventos e caminhos de mídia; normalizar no banco e espelhar no client. Testar limites, caracteres de controle e payloads excedentes.
- `todo` **Bloco 4 — limites administrativos no servidor [Média].** Decidir entre timeout nativo do Supabase e backend confiável; garantir que inatividade e TOTP recente para troca de senha não possam ser contornados por chamada direta. Manter o risco documentado se a arquitetura gratuita continuar sem essa garantia.
- `todo` **Bloco 5 — cabeçalhos do navegador [Média].** Definir camada de entrega com headers configuráveis e aplicar CSP, Permissions-Policy, Referrer-Policy, nosniff e HSTS; validar público e admin no smoke hospedado.
- `todo` **Bloco 6 — dependências [Baixa efetiva].** Atualizar React Router, PostCSS e NanoID para versões corrigidas; exigir `pnpm audit` sem alerta aplicável e regressão completa.
- `todo` **Fechamento.** Rodar `pnpm verify`, `supabase db lint`, testes concorrentes, varredura de segredos, revisão de rotas por ID e smoke de headers/RLS no hospedado; atualizar `DATA_MODEL.md`, `PROJECT.md` e runbook somente onde cada bloco alterar o contrato.

Hardening anterior:

- `done` **[Média]** Reserva de rifa trava números enquanto `pendente` (griefing/DoS de estoque): padrões reduzidos para 5 números/15 minutos, verificação humana avaliada e cancelamento manual documentado como resposta.
- `done` **[Info]** Signup confirmado como desabilitado no dashboard hospedado.
- `done` **[Info]** Views `*_public` mantidas como `security definer` para não abrir tabelas-base, protegidas com `security_barrier` e cobertura pgTAP da superfície completa; `security_invoker` foi avaliado e rejeitado por incompatibilidade com esse limite.

### P1 — Rastreabilidade administrativa

- `done` Criar `admin_profiles` com nome/apelido obrigatório, identidade vinculada a `auth.users` e RLS restrita a admins com MFA; o perfil não será público.
- `done` Pedir o nome/apelido junto com a senha no onboarding por convite, sincronizá-lo pelo banco antes de concluir o cadastro e solicitar essa etapa uma vez aos admins existentes sem perfil.
- `done` Registrar nos agregados administrativos (`caes`, `historias`, `eventos`, `reservas`, configurações e redes sociais) apenas a última alteração: data/hora, `updated_by` e snapshot do nome/apelido, preenchidos por trigger e nunca pelo client.
- `done` Tratar autores não administrativos como “Visitante” ou “Sistema” e propagar corretamente a autoria nos fluxos especiais de ativação/exclusão de evento, sorteio, RPCs de reserva e cron.
- `done` Expor o metadado somente nas consultas admin e mostrar uma linha discreta por card; em configurações/redes sociais, usar a alteração mais recente do grupo.
- `done` Cobrir onboarding/perfil, RLS, triggers, registros legados sem autor e fluxos automáticos com pgTAP e E2E; atualizar tipos gerados e `DATA_MODEL.md` na implementação.

Decisão temporária: o timeout de 7 dias no client permanece durante o desenvolvimento de Cuidados; o Bloco 4 reabre a garantia server-side antes da carga real e do smoke final. As decisões vinculantes de interface vivem em `UI_CONTRACTS.md`.

## Primitivos compartilhados

Catálogo, variantes e o que não se pode sobrescrever: `UI_CONTRACTS.md`. Antes de criar um componente, generalize um existente (`AGENTS.md`, prioridade 3).
