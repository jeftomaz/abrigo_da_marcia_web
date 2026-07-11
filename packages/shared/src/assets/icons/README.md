# Ícones

Coloque aqui os `.svg` do set (DS §5). Cada arquivo vira um ícone disponível por nome em
`<Icon name="..." />` (`shared/ui/Icon.tsx`) — o nome é o nome do arquivo sem extensão
(ex.: `pata.svg` → `<Icon name="pata" />`), sem precisar editar nenhum código.

**Requisito do DS:** o SVG deve pintar com `currentColor` (`fill="currentColor"` e/ou
`stroke="currentColor"` nos elementos internos, não uma cor fixa) — é isso que permite o ícone
herdar a cor do texto/contexto onde é usado (inclui inversão automática em dark mode e no
contexto on-brand, D-02).
