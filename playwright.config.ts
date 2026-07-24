import { defineConfig, devices } from '@playwright/test'

// Os testes rodam contra o Supabase local: subir com `supabase start` antes.
export const PUBLIC_URL = 'http://127.0.0.1:5173'
export const ADMIN_URL = 'http://127.0.0.1:5174'

// O `.env` da raiz aponta os apps para a homologação hospedada. Zerar as duas variáveis
// devolve o client aos padrões locais (packages/shared/src/supabase/client.ts): sem isto,
// a suíte leria — e a reserva escreveria — no banco hospedado. `process.env` com prefixo
// VITE_ vence o arquivo `.env`, e `reuseExistingServer: false` impede aproveitar um
// servidor que já esteja de pé apontando para o remoto.
const SUPABASE_LOCAL = { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }

export default defineConfig({
  testDir: './e2e',
  globalTeardown: './e2e/teardown.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: PUBLIC_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] }, testIgnore: /admin\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'pnpm --filter public exec vite --port 5173 --strictPort --host 127.0.0.1',
      url: PUBLIC_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: SUPABASE_LOCAL,
    },
    {
      command: 'pnpm --filter admin exec vite --port 5174 --strictPort --host 127.0.0.1',
      url: ADMIN_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: SUPABASE_LOCAL,
    },
  ],
})
