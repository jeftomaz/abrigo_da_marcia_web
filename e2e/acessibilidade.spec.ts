import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

const PADROES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// Débito conhecido e aceito: o coral da marca não alcança AA sobre nenhuma superfície
// do tema — nem sobre branco puro (3,32:1). Corrigir exige repactuar a identidade visual
// com o Abrigo, não ajustar componente. O invariante travado aqui é estreito: toda falha
// de contraste precisa envolver a família do coral de um lado e um token de superfície do
// outro. Cinza sobre cinza, ou qualquer cor nova, é regressão e quebra a suíte.
const FAMILIA_DA_MARCA = new Set(['#f15a55', '#fbd1d0', '#8d0e0c'])
const SUPERFICIES = new Set(['#ffffff', '#000000', '#e6e6e6', '#262626', '#404040'])

function ehDebitoConhecido(fg?: string, bg?: string) {
  if (!fg || !bg) return false
  const conhecidos = (cor: string) => FAMILIA_DA_MARCA.has(cor) || SUPERFICIES.has(cor)
  const envolveAMarca = FAMILIA_DA_MARCA.has(fg) || FAMILIA_DA_MARCA.has(bg)
  return conhecidos(fg) && conhecidos(bg) && envolveAMarca
}

const PAGINAS = [
  { rota: '/', nome: 'landing' },
  { rota: '/adocao', nome: 'adoção' },
  { rota: '/historias', nome: 'histórias' },
  { rota: '/eventos', nome: 'eventos' },
  { rota: '/rota-inexistente', nome: 'página não encontrada' },
]

type Contraste = { fgColor?: string; bgColor?: string }

async function auditar(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(PADROES).analyze()

  const outrasRegras = violations
    .filter((v) => v.id !== 'color-contrast')
    .map((v) => ({ regra: v.id, impacto: v.impact, onde: v.nodes.map((n) => n.target.join(' ')).slice(0, 3) }))

  const paresForaDaMarca = violations
    .filter((v) => v.id === 'color-contrast')
    .flatMap((v) => v.nodes)
    .map((no) => (no.any.find((c) => c.id === 'color-contrast')?.data ?? {}) as Contraste)
    .map(({ fgColor, bgColor }) => ({ fg: fgColor?.toLowerCase(), bg: bgColor?.toLowerCase() }))
    .filter(({ fg, bg }) => !ehDebitoConhecido(fg, bg))
    .map(({ fg, bg }) => `${fg} sobre ${bg}`)

  return { outrasRegras, paresForaDaMarca: [...new Set(paresForaDaMarca)] }
}

async function alternarParaEscuro(page: Page) {
  await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
  await expect(page.getByRole('button', { name: 'Ativar tema claro' })).toBeVisible()
  // `transition-colors` deixa cores intermediárias na tela; auditar antes do fim
  // mede um blend que não existe em repouso.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
}

test.describe('acessibilidade', () => {
  for (const { rota, nome } of PAGINAS) {
    for (const tema of ['claro', 'escuro'] as const) {
      test(`${nome} passa na auditoria no tema ${tema}`, async ({ page }) => {
        await page.goto(rota)
        await expect(page.getByRole('main')).toBeVisible()
        if (tema === 'escuro') await alternarParaEscuro(page)

        const { outrasRegras, paresForaDaMarca } = await auditar(page)
        expect(outrasRegras).toEqual([])
        expect(paresForaDaMarca).toEqual([])
      })
    }
  }

  test('card expandido de adoção prende o foco e o devolve ao fechar', async ({ page, browserName }) => {
    await page.goto('/adocao')
    const gatilho = page.getByRole('button', { name: /^Conhecer / }).first()
    await gatilho.click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    const { outrasRegras, paresForaDaMarca } = await auditar(page)
    expect(outrasRegras).toEqual([])
    expect(paresForaDaMarca).toEqual([])

    // O foco inicial precisa estar dentro do diálogo, senão o teclado continua na página de trás.
    await expect(dialogo.locator(':focus')).toHaveCount(1)

    // Vinte tabulações não podem escapar do diálogo. Só no Chromium: sem "Full Keyboard
    // Access" ligado, o WebKit tabula apenas entre campos de formulário e a varredura
    // mediria a limitação do navegador, não a armadilha de foco.
    if (browserName === 'chromium') {
      for (let i = 0; i < 20; i += 1) {
        await page.keyboard.press('Tab')
        expect(await dialogo.locator(':focus').count()).toBe(1)
      }
    }

    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden()
    // O Safari não foca um <button> ao clique, então não existe foco anterior para
    // devolver e a asserção mediria a plataforma, não o componente.
    if (browserName === 'chromium') await expect(gatilho).toBeFocused()
  })

  test('percorre a navegação do header apenas pelo teclado', async ({ page }) => {
    await page.goto('/')
    const adocao = page.getByRole('link', { name: 'Adoção', exact: true })

    await adocao.focus()
    await expect(adocao).toBeFocused()
    // Foco visível: o contorno não pode ser suprimido sem substituto.
    const contorno = await adocao.evaluate((el) => {
      const estilo = getComputedStyle(el)
      return { outlineStyle: estilo.outlineStyle, outlineWidth: estilo.outlineWidth }
    })
    expect(contorno.outlineStyle).not.toBe('none')
    expect(parseFloat(contorno.outlineWidth)).toBeGreaterThan(0)

    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/adocao$/)
  })
})
