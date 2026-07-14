# PROGRESS.md

- Fluxo Git definido: uma branch por tela; ao concluir, publicar e integrar à `main` antes de iniciar a próxima.
- Footer mobile reorganizado: logo/redes no topo, contato em largura total e créditos abaixo de um divisor; desktop preserva as duas colunas. Tipografia segue fluida e legível, sem overflow do e-mail.
- Conteúdo das `FeatureSection` ganhou margem lateral de 40px abaixo de `lg`, conforme os mockups mobile. Em `Nossos cuidados`, tokens fluidos ampliam a tipografia intermediária e encontram os tamanhos desktop sem salto no breakpoint.
- Fotos das `FeatureSection` padronizadas em até 448px abaixo de `lg`: “Conheça o abrigo” não cresce mais além das demais e “Voluntários” deixa de encolher em telas largas ainda no layout mobile.
- DER Supabase iniciado com `social_links`: Facebook e Instagram terão URLs configuráveis pelo admin e leitura pública por view filtrada. Nesta etapa não há migration nem integração com o footer; URLs oficiais continuam pendentes.
- Footer público integrado globalmente no `App`: fundo preto invariável entre temas, logo/contato, redes e créditos responsivos. Reusa `Logo`/`Icon`; perfis sociais seguem sem links porque as URLs oficiais não foram confirmadas.
- Fase Landing + Header concluída. Ajustes finais: `Voluntários` alinhado à esquerda no desktop; `Nossos cuidados` sem altura mínima de viewport; `CompactCard` eleva 4px no hover com `motion-safe`; Header sticky oculta ao descer e reaparece ao subir/focar.
- Landing usa `FeatureSection` em todas as seções compatíveis, com tons/layouts por prop e blobs responsivos. Escala padrão: títulos `text-5xl lg:text-8xl`, introduções `text-2xl`; exceção de `Voluntários` no mobile mantém o título em uma linha.
- Primitivos compartilhados consolidados: `Action`, `CompactCard`, `ExpandedCardDialog`, `FeatureSection` e `Switch`. Modal tem foco inicial, trap de Tab, Esc/clique externo e retorno de foco; cards respeitam `prefers-reduced-motion`.
- `Doacao` segue os mockups mobile polidos: recorrência ativa, valores 10/20/30/50/100/150 e sem valor customizado. Seleção de valor inverte cores; pagamento segue visual enquanto não houver backend.
- Assets `landing_conheca.jpg` e `landing_doacao.jpg` foram convertidos de HEIC incorretamente nomeado para JPEG real. Fotos e conteúdo atuais de previews permanecem placeholders até os dados das fases dedicadas.
- Fundação Supabase/RLS/auth admin foi adiada para Adoção, primeira fase com dados reais. Formulário de adoção existente continua em `https://forms.gle/nLSjXJyeLGUJXZj27`.
- Tailwind v4 usa `@theme` CSS-first e precisa de `@source "../../../packages/shared/src"` para incluir classes do pacote compartilhado. Paleta e tipografia fluida vivem em `apps/public/src/index.css`.
