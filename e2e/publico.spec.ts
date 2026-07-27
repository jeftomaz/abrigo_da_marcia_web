import { expect, test } from './fixtures'
import { MARCA_E2E, executarSql } from './banco'

// Fixtures do seed: 4 cães disponíveis, 1 história publicada, 1 rifa ativa.
const CAES_DISPONIVEIS = ['Dentinho', 'Doguinho', 'Mel', 'Negão']
const CAES_FORA_DO_CATALOGO = ['Bidu', 'Fumaça']
const HISTORIA_PUBLICADA = 'Clarinha'
const HISTORIAS_EM_RASCUNHO = ['Maia', 'Moleque']
const RIFA_ATIVA = 'Rifa de Inverno'

test.describe('site público', () => {
  test('navega pelo header entre landing, adoção e histórias', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('navigation')).toBeVisible()

    await page.getByRole('link', { name: 'Adoção', exact: true }).click()
    await expect(page).toHaveURL(/\/adocao$/)
    await expect(page.getByRole('link', { name: 'Adoção', exact: true })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('link', { name: 'Histórias', exact: true }).click()
    await expect(page).toHaveURL(/\/historias$/)

    await page.getByRole('link', { name: 'Ir para a página inicial' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('mostra no catálogo somente os cães disponíveis', async ({ page }) => {
    await page.goto('/adocao')
    const catalogo = page.getByRole('region', { name: 'Cães disponíveis' })
    await expect(catalogo).toBeVisible()

    for (const nome of CAES_DISPONIVEIS) {
      await expect(catalogo.getByRole('button', { name: `Conhecer ${nome}` })).toBeVisible()
    }
    // Adotados e falecidos saem do catálogo: a view pública não os retorna.
    for (const nome of CAES_FORA_DO_CATALOGO) {
      await expect(catalogo.getByRole('button', { name: `Conhecer ${nome}` })).toHaveCount(0)
    }
  })

  test('abre o card expandido de um cão e fecha pelo teclado', async ({ page }) => {
    await page.goto('/adocao')
    await page.getByRole('button', { name: `Conhecer ${CAES_DISPONIVEIS[0]}` }).click()

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('heading', { name: CAES_DISPONIVEIS[0] })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden()
  })

  test('publica somente histórias marcadas como publicadas', async ({ page }) => {
    await page.goto('/historias')
    await expect(page.getByText(HISTORIA_PUBLICADA).first()).toBeVisible()

    for (const nome of HISTORIAS_EM_RASCUNHO) {
      await expect(page.getByText(nome, { exact: true })).toHaveCount(0)
    }
  })

  test('mantém o card Pix consistente na doação', async ({ page }) => {
    await page.route('**/rest/v1/site_settings_public?*', (route) => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        adoption_form_url: 'https://example.com/adocao',
        pix_city: 'RIBEIRAO PRETO',
        pix_key: 'pix@abrigo.test',
        pix_receiver: 'ABRIGO DA MARCIA',
        recurring_donation_urls: {},
        volunteer_form_url: 'https://example.com/voluntariado',
      }),
    }))
    await page.goto('/')
    const doacao = page.locator('#doacao')

    await doacao.getByRole('switch', { name: 'Alternar entre doação única e recorrente' }).click()
    await doacao.getByRole('button', { name: 'R$ 10', exact: true }).click()
    await doacao.getByRole('button', { name: 'Realizar doação' }).click()

    const confirmacao = page.getByRole('dialog').filter({ hasText: 'Pix para doação' })
    const titulo = confirmacao.getByRole('heading', { name: 'Pix para doação' })
    const qrCode = confirmacao.getByRole('img', { name: /QR Code do Pix/i })
    const copiar = confirmacao.getByRole('button', { name: 'Copiar código PIX' })
    const fechar = confirmacao.getByRole('button', { name: 'Fechar' })

    await expect(confirmacao).toBeVisible()
    await expect(titulo).toHaveCSS('text-align', 'left')
    await expect(qrCode).toBeVisible()
    await expect(copiar).toBeVisible()
    await expect(fechar).toBeVisible()

    const qrSize = await qrCode.evaluate((element) => element.getBoundingClientRect())
    expect(qrSize.width).toBeGreaterThanOrEqual(192)
    expect(qrSize.height).toBe(qrSize.width)
    expect(await fechar.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(await copiar.evaluate((element) => element.getBoundingClientRect().width))
  })

  test('reserva números da rifa ativa e recebe o Pix', async ({ page }) => {
    const nomeDaReserva = `${MARCA_E2E} Reserva ${Date.now()}`
    await page.goto('/eventos')

    await page.getByRole('button', { name: `Reservar: ${RIFA_ATIVA}` }).click()
    const rifa = page.getByRole('dialog')
    await expect(rifa.getByRole('heading', { name: RIFA_ATIVA })).toBeVisible()

    // A grade só renderiza depois que a disponibilidade chega do banco.
    await expect(rifa.getByText('Carregando números...')).toHaveCount(0)
    const disponiveis = rifa.getByRole('button', { name: /: disponível$/ })
    await expect(disponiveis.first()).toBeVisible()

    const escolhidos = await disponiveis.evaluateAll((botoes) =>
      botoes.slice(0, 2).map((botao) => botao.getAttribute('aria-label') ?? ''),
    )
    expect(escolhidos).toHaveLength(2)
    for (const rotulo of escolhidos) {
      await rifa.getByRole('button', { name: rotulo }).click()
    }
    for (const rotulo of escolhidos) {
      const numero = rotulo.replace(': disponível', ': selecionado')
      await expect(rifa.getByRole('button', { name: numero })).toHaveAttribute('aria-pressed', 'true')
    }

    await page.getByRole('button', { name: 'Finalizar sua reserva' }).click()

    const checkout = page.getByRole('dialog').filter({ hasText: 'Nome completo' })
    await checkout.getByLabel('Nome completo').fill(nomeDaReserva)
    await checkout.getByLabel('Telefone com DDD').fill('(16) 98765-4321')
    await checkout.getByRole('button', { name: 'Finalizar sua reserva' }).click()

    const confirmacao = page.getByRole('dialog').filter({ hasText: 'Reserva confirmada!' })
    await expect(confirmacao).toBeVisible()
    await expect(confirmacao.getByRole('img', { name: /QR Code do Pix/i })).toBeVisible()
    await expect(confirmacao.getByRole('button', { name: 'Copiar código PIX' })).toBeVisible()

    // O contato é normalizado por trigger: o E2E confirma o efeito no banco, não só na tela.
    const persistida = executarSql(
      `select status, customer_contact from public.reservas where customer_name = '${nomeDaReserva}'`,
    )
    expect(persistida).toBe('pendente|+5516987654321')
  })
})
