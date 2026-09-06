import { readdir, readFile } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const adminDist = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/admin/dist')
const forbiddenMarkers = [
  '@abrigo.local',
  'Entrar no ambiente local',
  'VITE_LOCAL_ADMIN_',
  'generateLocalTotp',
  'sb-127-auth-token',
  'totpSecret',
]
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg'])
const violations = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(path)
      continue
    }
    if (entry.name === 'entrar.html') violations.push(path)
    if (!textExtensions.has(extname(entry.name))) continue
    const content = await readFile(path, 'utf8')
    for (const marker of forbiddenMarkers) {
      if (content.includes(marker)) violations.push(`${path}: ${marker}`)
    }
  }
}

await scan(adminDist)
if (violations.length > 0) {
  console.error(`O build de produção contém acesso administrativo local:\n${violations.join('\n')}`)
  process.exit(1)
}

console.log('check-production-bundle: ok')
