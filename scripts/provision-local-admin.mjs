import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createServer } from '../apps/admin/node_modules/vite/dist/node/index.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({
  root,
  appType: 'custom',
  logLevel: 'silent',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
})

try {
  const { ambientePublicoLocal, provisionarAdmin } = await server.ssrLoadModule('/e2e/admin.ts')
  const environment = ambientePublicoLocal()
  const credentials = await provisionarAdmin({
    email: 'local-admin@abrigo.local',
    password: `Local-${randomBytes(18).toString('base64url')}-9aA!`,
    displayName: 'Admin Local',
  })
  process.stdout.write([
    `VITE_SUPABASE_URL=${JSON.stringify(environment.apiUrl)}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${JSON.stringify(environment.publishableKey)}`,
    `VITE_LOCAL_ADMIN_EMAIL=${JSON.stringify(credentials.email)}`,
    `VITE_LOCAL_ADMIN_PASSWORD=${JSON.stringify(credentials.senha)}`,
    `VITE_LOCAL_ADMIN_TOTP_SECRET=${JSON.stringify(credentials.segredo)}`,
    '',
  ].join('\n'))
} finally {
  await server.close()
}
