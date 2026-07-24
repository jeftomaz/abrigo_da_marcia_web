import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { ADMIN_URL } from '../playwright.config'
import { codigoTotpComJanelaFolgada, provisionarAdmin, removerAdminDeTeste } from './admin'
import { expect, test } from './fixtures'

const PADROES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const FAMILIA_DA_MARCA = new Set(['#f15a55', '#fbd1d0', '#8d0e0c'])
const SUPERFICIES = new Set(['#ffffff', '#000000', '#e6e6e6', '#262626', '#404040'])

let credenciais: { email: string; senha: string; segredo: string }

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
  test('exige senha e TOTP antes de liberar a gestão', async ({ page }) => {
    await page.goto(ADMIN_URL)
    await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible()
    // A gestão não pode aparecer para quem ainda não passou pelos dois fatores.
    await expect(page.getByRole('link', { name: 'Cães' })).toHaveCount(0)

    await entrar(page)

    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
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
