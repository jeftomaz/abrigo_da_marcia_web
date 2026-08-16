# AGENTS.md — Diretrizes para Agentes

Regras universais de trabalho. Instruções específicas do projeto: ver `PROJECT.md`.

## Prioridades (ordem de desempate)

1. **Fidelidade às instruções.** Nunca reinterprete, expanda ou "melhore" um pedido sem confirmar. Em ambiguidade: pergunte antes de implementar.
2. **Economia de tokens.** Respostas e código enxutos. Sem preâmbulos, sem repetir contexto já conhecido, sem comentários óbvios no código.
3. **Arquivos mínimos, reutilização máxima.** Antes de criar qualquer arquivo/componente, verifique se um existente resolve ou pode ser generalizado. Crie um elemento novo **apenas e exclusivamente** quando nenhum existente for compatível nem generalizável por prop/variant — meta: elementos coesos, constantes e padronizados. Dois elementos similares → proponha unificar (com prop/variant) antes de duplicar. Na dúvida entre criar e generalizar, generalize.
4. **Arquitetura legível com leitura mínima.** Um leitor (humano ou agente) deve entender o papel de um arquivo pelo nome e localização, e seu funcionamento lendo só ele + imports diretos.
5. **Escrever o mínimo.** Se código pode ser reaplicado, reaplique. Prefira extrair função/componente a copiar trecho. Não crie abstração especulativa ("talvez precise depois") — abstraia apenas na 2ª ocorrência real.

## Regras de código

- Sem código morto, sem TODOs órfãos, sem arquivos placeholder.
- Nomes autodescritivos > comentários. Comente apenas o não-óbvio (workarounds, decisões de segurança, regras de negócio).
- Um arquivo = uma responsabilidade. Se precisa de "e" para descrever o arquivo, divida — exceto se dividir gerar arquivos triviais (<15 linhas).
- Alterações mínimas: modifique apenas o necessário para a tarefa. Não reformate/renomeie código fora do escopo.

## Arquivos de acompanhamento

Manter na raiz, sempre atualizados **na mesma entrega** que os altera (nunca "depois"):

| Arquivo | Conteúdo | Formato |
|---|---|---|
| `ROADMAP.md` | Fases/páginas planejadas, ordem, status (`todo/doing/done`) | Lista curta |
| `PROGRESS.md` | O que foi feito, decisões tomadas e pendências ativas | Log reverso (recente no topo), 1-3 linhas por entrada |
| `DATA_MODEL.md` | Schema, relações, policies — fonte de verdade do banco | Tabelas/SQL resumido |
| `UI_CONTRACTS.md` | Componentes compartilhados: variantes, o que não sobrescrever, decisões vinculantes de UI | Tabela + lista |
| `PROJECT.md` | Contexto, stack e regras específicas do projeto | Seções curtas |

Regras para esses arquivos:
- Mesmos princípios do código: mínimos, sem prosa decorativa, sem histórico morto (entradas de `PROGRESS.md` obsoletas podem ser removidas se não explicam decisões vigentes).
- Um agente novo deve entender estado e contexto do projeto lendo apenas esses arquivos, sem ler o histórico da conversa.

## Fluxo de trabalho por tarefa

1. Ler `PROJECT.md` + `ROADMAP.md` + `PROGRESS.md`. Só leia `DATA_MODEL.md` se a tarefa toca dados e `UI_CONTRACTS.md` se toca interface — carregar os dois em toda tarefa custa contexto sem dar nada em troca.
2. Confirmar entendimento se houver ambiguidade relevante; caso contrário, executar direto.
3. Implementar o escopo pedido — nada além.
4. Atualizar arquivos de acompanhamento afetados.
5. Reportar de forma sucinta: o que foi feito, decisões tomadas, pendências criadas.

## Anti-padrões (nunca fazer)

- Criar componente novo quando um existente aceita generalização simples.
- Instalar dependência sem justificar e confirmar.
- Implementar além do escopo pedido ("já aproveitei e fiz X").
- Duplicar informação entre arquivos de acompanhamento (cada fato vive em um único lugar).
- Refatorações amplas não solicitadas.
- Incluir coautoria (`Co-Authored-By` ou equivalente) em commits, sob qualquer hipótese.