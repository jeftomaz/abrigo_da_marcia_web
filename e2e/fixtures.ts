import { test as base } from '@playwright/test'

// O `.env` da raiz aponta para a homologação hospedada. Se a configuração do webServer
// falhar em sobrepô-lo, a suíte escreveria reservas em dados reais — então cada teste
// derruba qualquer chamada que escape do Supabase local.
export const test = base.extend({
  page: async ({ page }, use) => {
    const remotas: string[] = []
    page.on('request', (request) => {
      const url = new URL(request.url())
      const supabase = url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')
      if (supabase) remotas.push(url.origin)
    })

    await use(page)

    if (remotas.length > 0) {
      throw new Error(
        `O app falou com um Supabase remoto durante o teste: ${[...new Set(remotas)].join(', ')}. ` +
        'A suíte só pode usar o stack local.',
      )
    }
  },
})

export { expect } from '@playwright/test'
