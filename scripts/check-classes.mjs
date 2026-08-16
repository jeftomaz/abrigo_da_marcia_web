// Trava as duas regras de UI que o TypeScript e o oxlint não expressam. Roda no
// `pnpm lint`, logo entra no CI e no `pnpm verify`.
//
// Funciona como catraca: a linha de base abaixo registra as violações que já
// existiam quando a trava foi criada. Passar do número registrado falha; ficar
// abaixo também falha, pedindo que a base seja reduzida. Assim nada novo entra
// enquanto o passivo é limpo (Fases 3 e 4 do plano) sem poder voltar a crescer.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SCAN_DIRS = ['apps', 'packages']

const RULES = {
  important: {
    // `!px-1` fura o contrato de `Action`, cujo tamanho é decidido por `size`
    // (ver packages/shared/src/components/Action.tsx). Precisou de outro
    // espaçamento? Adicione um `ActionSize`.
    pattern: /![a-z][a-z0-9]*-[a-z0-9./[\]-]+/g,
    message: 'classe com `!` sobrepondo componente compartilhado — use uma variant/size do próprio componente',
    baseline: {
      'apps/admin/src/components/DogRow.tsx': 17,
      'apps/admin/src/components/StoryRow.tsx': 16,
      'apps/admin/src/components/EventRow.tsx': 13,
      'apps/admin/src/components/AdminHeader.tsx': 12,
    },
  },
  breakpoint: {
    // Breakpoint arbitrário nasce solto em cada tarefa e vira escala paralela.
    // Todo ponto de corte precisa de nome em packages/shared/src/theme.css.
    pattern: /(?:min|max)-\[[0-9.]+(?:rem|px)\]:/g,
    message: 'breakpoint arbitrário — declare um `--breakpoint-*` nomeado no tema compartilhado',
    baseline: {},
  },
}

// Só o conteúdo de literais de string é analisado: fora deles, `!` é negação de
// JavaScript (`!draft`, `!await`) e não tem relação com classe do Tailwind.
const STRING_LITERAL = /'[^'\n]*'|"[^"\n]*"|`[^`]*`/g

function collectFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectFiles(full, found)
    else if (entry.endsWith('.tsx')) found.push(full)
  }
  return found
}

const counts = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, {}]))

for (const dir of SCAN_DIRS) {
  for (const file of collectFiles(join(ROOT, dir))) {
    const path = relative(ROOT, file)
    const literals = readFileSync(file, 'utf8').match(STRING_LITERAL) ?? []
    for (const [rule, { pattern }] of Object.entries(RULES)) {
      const hits = literals.reduce((total, literal) => total + (literal.match(pattern)?.length ?? 0), 0)
      if (hits > 0) counts[rule][path] = hits
    }
  }
}

const failures = []

for (const [rule, { baseline, message }] of Object.entries(RULES)) {
  const found = counts[rule]
  for (const [path, hits] of Object.entries(found)) {
    const allowed = baseline[path] ?? 0
    if (hits > allowed) {
      failures.push(
        `${path}: ${hits} ocorrência(s) de ${rule}, base é ${allowed}\n    ${message}`,
      )
    }
  }
  for (const [path, allowed] of Object.entries(baseline)) {
    const hits = found[path] ?? 0
    if (hits < allowed) {
      failures.push(
        `${path}: ${rule} caiu de ${allowed} para ${hits} — reduza a base em scripts/check-classes.mjs`,
      )
    }
  }
}

if (failures.length > 0) {
  console.error(`\ncheck-classes: ${failures.length} problema(s)\n`)
  for (const failure of failures) console.error(`  ✗ ${failure}`)
  console.error('')
  process.exit(1)
}

const pending = Object.values(RULES).reduce(
  (total, { baseline }) => total + Object.values(baseline).reduce((sum, n) => sum + n, 0),
  0,
)
console.log(`check-classes: ok (${pending} violações herdadas na base, nenhuma nova)`)
