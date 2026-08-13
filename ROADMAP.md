# ROADMAP.md

Status por fase e pendências abertas. O histórico do que foi feito vive em `PROGRESS.md`.

## Fases

1. Fundação (monorepo, Supabase, RLS, auth + MFA) — `done`
2. Landing + Header — `done`
3. Adoção (público + admin) — `done`
4. Histórias (público + admin) — `done`
5. Eventos/arrecadação (público + admin + reservas) — `done`
6. Configurações admin — `done`
7. Publicação, produção e hardening — `doing` **← atual**

## Pendências abertas

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

### P0 — Correções operacionais e mobile

- `done` Fixar nome e tags nos cards expandidos de Adoção e Histórias, limitando a rolagem à descrição e reduzindo sua tipografia no mobile.
- `todo` Alinhar o QR Pix mobile ao contrato E2E: hoje renderiza com 160 px, abaixo dos 192 px esperados.
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

### P1 — Hardening (auditoria de 2026-07-25)

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

Decisões aceitas (não reabrir): timeout de sessão de 7 dias só no client (trade-off do plano Free — ver `PROJECT.md`); débito de contraste AA do coral `#f15a55` (identidade aprovada pelo Abrigo, travado pela suíte E2E nos tokens da marca).

## Primitivos compartilhados

`packages/shared/src/components`: `Action`, `BlobImage`, `CompactCard`, `Dialog`, `ExpandedCardDialog`, `FeatureSection`, `Header`, `Icon`, `ImageLightbox`, `ImagePlaceholder`, `Logo`, `SelectField`, `Switch`, `TextField`. Antes de criar um componente novo, generalizar um destes (ver `AGENTS.md`, prioridade 3).
