# UI_CONTRACTS.md — Contrato dos componentes compartilhados

Leitura obrigatória antes de qualquer tarefa que toque interface. Responde o que o catálogo de nomes não respondia: qual componente usar, quais variantes existem e **o que não se pode sobrescrever por `className`**.

Fonte dos tokens: `packages/shared/src/theme.css`. Componentes: `packages/shared/src/components/`.

## Regras transversais

1. **Token só do tema.** Cor, fonte, breakpoint e tamanho de texto vêm de `theme.css`, importado pelos dois apps. Nunca hardcode em componente. Cada `index.css` só pode conter o que é exclusivo daquele app.
2. **Breakpoint só nomeado.** A escala é fechada: `galeria` (22rem), `linha` (24rem), `acoes` (28rem), os do Tailwind (`sm` 40rem, `md` 48rem, `lg` 64rem…) e `desk` (85rem). `min-[Xrem]:` solto é barrado por `scripts/check-classes.mjs`.
   - Público vira em `lg`. Admin vira em `desk`. **Componente compartilhado não decide breakpoint de viewport** — recebe por prop/variant.
3. **`className` não sobrescreve o que o componente decide.** Quem decide é a ordem na folha de estilo, não a ordem no atributo: `px-16` de um tamanho vence um `px-7` passado por fora. Precisou de outro valor? **Acrescente uma variante ou tamanho ao componente.** Usar `!` para forçar é barrado pelo `check-classes` — foi assim que o contrato do `Action` acabou furado em quatro arquivos.
4. **Antes de criar componente, generalize um existente.** Só crie novo se nenhum for compatível nem generalizável por prop/variant (`AGENTS.md`, prioridade 3).

## Primitivos

| Componente | Resolve | Variantes / props de forma | Não sobrescreva |
|---|---|---|---|
| `Action` | Todo botão, link e CTA | `variant`: `primary`/`secondary`/`neutral` × `-adaptive`/`-inverted`/`-on-brand`. `size`: `default`, `medium`, `small`, `compact`, `admin-row`, `admin-row-event`, `admin-inline` | **`gap`, `px`, `py`, `text-*`** — vivem em `SIZE_CLASSES`. Escolha a variante pela superfície **imediata** (contraste), não pelo tema da página |
| `CardGrid` | Grade de cards do público | `variant`: `page` (`gap-5`/`lg:gap-6`) ou `preview` (`gap-4`). `label` vira o `aria-label` da região | **`gap` e `mt`** — foi a divergência entre 4 cópias que gerou retrabalho recorrente |
| `CompactCard` | Card de catálogo/listagem | `orientation`: `vertical` (padrão), `horizontal`, `responsive`. `imageAspect`: `square` (padrão), `landscape` | Proporção da imagem e altura do card — use `imageAspect`/`orientation` |
| `ExpandedCardDialog` | Card aberto em diálogo | `variant`: `default`, `adoption`, `story`, `product`. `images`, `expandableImages`, `tags`, `primaryAction`, `persistentClose` | Estrutura do cabeçalho: nome e tags ficam fixos, só a descrição rola |
| `Dialog` | Base de qualquer diálogo | `ariaLabel` ou `ariaLabelledBy` (um dos dois é obrigatório), `onClose`, `persistentClose`, `active` | Foco, `Escape` e overlay — já tratados |
| `FeatureSection` | Seção da landing com imagem | `tone`, `layout`: `default`/`compact`, `imagePosition`: `start`/`end`, `after`, `contentClassName` | Grade e `max-w` do container |
| `TextField` | Campo de formulário | `as`: `input` (padrão), `select`, `textarea` — o resto são atributos nativos | Borda, foco e estado desabilitado |
| `SelectField` | Select com rótulo | `variant`: `filter`, `product`. `label`, `accessibleLabel` | Aparência do controle |
| `Switch` | Alternância booleana | `variant`: `neutra`, `marca` | — |
| `BlobImage` | Foto com máscara orgânica | `aspect`: `square`, `portrait`, `priority` | Máscara e proporção |
| `ImagePlaceholder` | Vazio de foto | `label` (obrigatório, vira `aria-label`) | Fundo de marca e o ícone |
| `Logo` | Marca | `variant`: `full`, `icon` | `fill` do SVG — hoje `AdminHeader` sobrescreve com `!`; é pendência aberta |
| `Header` | Navegação | `items` (`NavItem[]`) | Altura, espaçamento e breakpoint das abas — padronizados entre os dois apps |
| `Icon` | Ícone do sprite | `name` | `size` vem de quem usa |
| `ImageLightbox` | Foto ampliada | `src`, `alt`, `onClose` | — |

## Decisões vinculantes

Não reabrir sem motivo novo. Vivem aqui, e não no log do `PROGRESS.md`, para não ficarem soterradas no histórico.

- **Padding de `Action` não se sobrescreve por `className`.** Precisa de outro espaçamento? Acrescente um `ActionSize`. `gap` mora no tamanho, não no `BASE_CLASSES` — foi ele que, ao vencer o tamanho na folha de estilo, obrigou quatro arquivos ao `!`.
- **Superfície 100% branca no claro é 100% preta no escuro.** Cores de estado e ilustrações não entram nessa correspondência.
- **Débito de contraste AA do coral `#f15a55`** é decisão aceita (identidade aprovada pelo Abrigo) e está travada pela suíte E2E nos tokens da marca.
- **Componente compartilhado com `lg:` só é renderizado no público.** Se algum for para o admin, revise o breakpoint antes: o admin vira em `desk` (85rem), não em `lg` (64rem).
- **Suíte vermelha bloqueia entrega.** Nenhum teste falhando é tolerado como pendência — vermelho tolerado deixa de ser lido.

## Ao mexer em card ou grade

A área concentra o maior retrabalho do projeto e agora tem contrato travado por E2E (`e2e/publico.spec.ts`): colunas e espaçamento das 4 grades, e proporção da imagem em 393 e 1280 px. Se o teste falhar, a mudança é real — atualize o teste **por decisão**, não para fazer passar.

Divergência conhecida e intencional: Histórias usa `landscape` na página e o padrão `square` na landing.
