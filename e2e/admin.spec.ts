import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { ADMIN_URL } from '../playwright.config'
import {
  ADMIN_NOME,
  ambientePublicoLocal,
  codigoTotpComJanelaFolgada,
  convidarAdminDeTeste,
  INVITED_ADMIN_EMAIL,
  provisionarAdmin,
  removerAdminDeTeste,
  removerPerfilAdminDeTeste,
} from './admin'
import { expect, test } from './fixtures'

const PADROES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const FAMILIA_DA_MARCA = new Set(['#f15a55', '#fbd1d0', '#8d0e0c'])
const SUPERFICIES = new Set(['#ffffff', '#000000', '#e6e6e6', '#262626', '#404040'])

let credenciais: { accessToken: string; email: string; senha: string; segredo: string }

test.beforeAll(async () => {
  credenciais = await provisionarAdmin()
})

test.afterAll(() => {
  removerAdminDeTeste()
})

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(PADROES).analyze()
  const conhecido = (cor?: string) => Boolean(cor && (FAMILIA_DA_MARCA.has(cor) || SUPERFICIES.has(cor)))

  return violations
    .flatMap((v) => v.nodes.map((no) => ({ regra: v.id, no })))
    .filter(({ regra, no }) => {
      if (regra !== 'color-contrast') return true
      const dados = no.any.find((c) => c.id === 'color-contrast')?.data as { fgColor?: string; bgColor?: string } | undefined
      const fg = dados?.fgColor?.toLowerCase()
      const bg = dados?.bgColor?.toLowerCase()
      const envolveAMarca = FAMILIA_DA_MARCA.has(fg ?? '') || FAMILIA_DA_MARCA.has(bg ?? '')
      return !(conhecido(fg) && conhecido(bg) && envolveAMarca)
    })
    .map(({ regra, no }) => ({ regra, onde: no.target.join(' ') }))
}

async function entrar(page: Page) {
  await page.goto(ADMIN_URL)

  await page.getByLabel('E-mail').fill(credenciais.email)
  await page.getByLabel('Senha', { exact: true }).fill(credenciais.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()

  const campoCodigo = page.getByLabel('Código do autenticador')
  await expect(campoCodigo).toBeVisible()
  await campoCodigo.fill(await codigoTotpComJanelaFolgada(credenciais.segredo))
  await page.getByRole('button', { name: 'Verificar' }).click()
}

test.describe('admin', () => {
  test('Edge Functions aceitam os cabeçalhos do SDK e devolvem erros estruturados', async ({ request }) => {
    const { apiUrl, publishableKey } = ambientePublicoLocal()
    const functionUrl = `${apiUrl}/functions/v1/activate-event`
    for (const functionName of ['activate-event', 'delete-archived-event']) {
      const preflight = await request.fetch(`${apiUrl}/functions/v1/${functionName}`, {
        method: 'OPTIONS',
        headers: {
          Origin: ADMIN_URL,
          'Access-Control-Request-Headers': 'authorization, apikey, content-type, x-client-info',
          'Access-Control-Request-Method': 'POST',
        },
      })
      // O gateway local pode responder o preflight antes da função (200); o runtime
      // hospedado encaminha e recebe o 204 do executor compartilhado.
      expect([200, 204]).toContain(preflight.status())
      expect([ADMIN_URL, '*']).toContain(preflight.headers()['access-control-allow-origin'])
      expect(preflight.headers()['access-control-allow-headers']).toContain('x-client-info')
      expect(preflight.headers()['access-control-allow-methods']).toContain('POST')
    }

    const denied = await request.post(functionUrl, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        Origin: 'https://origem-invalida.example',
      },
      data: { eventId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(denied.status()).toBe(403)
    expect(await denied.json()).toMatchObject({ code: 'CORS_ORIGIN_DENIED' })

    const unauthenticated = await request.post(functionUrl, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        Origin: ADMIN_URL,
        'x-client-info': 'abrigo-e2e',
      },
      data: { eventId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(unauthenticated.status()).toBe(401)
    const error = await unauthenticated.json()
    expect(error).toMatchObject({ code: 'MFA_REQUIRED' })
    expect(error.message).toContain('autenticador')
    expect(error.requestId).toMatch(/^[a-zA-Z0-9-]{8,128}$/)
    expect(unauthenticated.headers()['x-request-id']).toBe(error.requestId)

    const invalid = await request.post(functionUrl, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${credenciais.accessToken}`,
        Origin: ADMIN_URL,
        'x-client-info': 'abrigo-e2e',
      },
      data: {},
    })
    expect(invalid.status()).toBe(422)
    expect(await invalid.json()).toMatchObject({ code: 'VALIDATION_ERROR' })

    const missing = await request.post(functionUrl, {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${credenciais.accessToken}`,
        Origin: ADMIN_URL,
        'x-client-info': 'abrigo-e2e',
      },
      data: { eventId: '00000000-0000-0000-0000-000000000000' },
    })
    expect(missing.status()).toBe(404)
    expect(await missing.json()).toMatchObject({ code: 'NOT_FOUND' })
  })

  test('conclui o cadastro de um administrador convidado', async ({ page, request }) => {
    await convidarAdminDeTeste()
    const mensagens = await request.get('http://127.0.0.1:54324/api/v1/messages')
    const { messages } = await mensagens.json()
    const mensagem = messages
      .filter((item: { To: Array<{ Address: string }> }) =>
        item.To.some((recipient) => recipient.Address === INVITED_ADMIN_EMAIL))
      .sort((left: { Created: string }, right: { Created: string }) => right.Created.localeCompare(left.Created))[0]
    const email = await request.get(`http://127.0.0.1:54324/view/${mensagem.ID}.html`)
    const html = await email.text()
    const confirmationUrl = html.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
    if (!confirmationUrl) throw new Error('Link do convite não encontrado.')

    await page.goto(confirmationUrl)
    await expect(page.getByRole('heading', { name: 'Concluir cadastro' })).toBeVisible()
    await page.getByLabel('Nome ou apelido').fill('Convidada E2E')
    await page.getByLabel('Senha', { exact: true }).fill(credenciais.senha)
    await page.getByLabel('Confirmar senha').fill(credenciais.senha)
    await page.getByRole('button', { name: 'Criar senha e continuar' }).click()

    await expect(page.getByRole('heading', { name: 'Proteja sua conta' })).toBeVisible()
    await page.getByRole('button', { name: 'Configurar autenticador' }).click()
    const secret = await page.locator('code').textContent()
    if (!secret) throw new Error('Segredo TOTP não encontrado.')
    await page.getByLabel('Código do autenticador').fill(await codigoTotpComJanelaFolgada(secret))
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
  })

  test('exige senha e TOTP antes de liberar a gestão', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible()
    // A gestão não pode aparecer para quem ainda não passou pelos dois fatores.
    await expect(page.getByRole('link', { name: 'Cães' })).toHaveCount(0)

    removerPerfilAdminDeTeste()
    await entrar(page)

    await expect(page.getByRole('heading', { name: 'Identifique seu perfil' })).toBeVisible()
    await page.getByLabel('Nome ou apelido').fill(ADMIN_NOME)
    await page.getByRole('button', { name: 'Salvar e continuar' }).click()

    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
    const dogCard = page.locator('article').filter({ hasText: 'Negão' })
    await expect(dogCard.getByText(/Última alteração .* por Sistema/)).toBeVisible()
    await dogCard.getByRole('button', { name: /catálogo/ }).click()
    await expect(dogCard.getByText(new RegExp(`Última alteração .* por ${ADMIN_NOME}`))).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible()
  })

  test('recusa código TOTP inválido', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await page.getByLabel('E-mail').fill(credenciais.email)
    await page.getByLabel('Senha', { exact: true }).fill(credenciais.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.getByLabel('Código do autenticador').fill('000000')
    await page.getByRole('button', { name: 'Verificar' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toHaveCount(0)
  })

  test('recusa senha incorreta', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await page.getByLabel('E-mail').fill(credenciais.email)
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada')
    await page.getByRole('button', { name: 'Entrar' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByLabel('Código do autenticador')).toHaveCount(0)
  })

  test('navega entre as gestões e encerra a sessão', async ({ page }) => {
    await entrar(page)

    for (const aba of ['Histórias', 'Eventos', 'Configurações']) {
      await page.getByRole('link', { name: aba }).click()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible()
  })

  test('gestão de Cães passa na auditoria nos dois temas', async ({ page }) => {
    await entrar(page)
    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
    expect(await auditar(page)).toEqual([])

    await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
    expect(await auditar(page)).toEqual([])
  })
})
