import { expect, test } from './fixtures'
import { MARCA_E2E, executarSql } from './banco'

// Fixtures do seed: 4 cães disponíveis, 1 história publicada, 1 rifa ativa.
const CAES_DISPONIVEIS = ['Dentinho', 'Doguinho', 'Mel', 'Negão']
const CAES_FORA_DO_CATALOGO = ['Bidu', 'Fumaça']
const HISTORIA_PUBLICADA = 'Clarinha'
const HISTORIAS_EM_RASCUNHO = ['Maia', 'Moleque']
const RIFA_ATIVA = 'Rifa de Inverno'

test.describe('site público', () => {
  test('navega pela barra mobile com espaçamento lateral e posição inferior', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await page.goto('/')
    const navigation = page.getByRole('navigation', { name: 'Navegação mobile' })
    await expect(navigation).toBeVisible()
    const navigationBox = await navigation.boundingBox()
    expect(navigationBox?.x).toBe(0)
    expect(navigationBox?.width).toBe(320)
    expect(navigationBox ? navigationBox.y + navigationBox.height : 0).toBeCloseTo(844, 0)
    expect(await navigation.evaluate((element) => {
      const styles = getComputedStyle(element)
      return {
        gap: styles.columnGap,
        paddingLeft: styles.paddingLeft,
        paddingRight: styles.paddingRight,
      }
    })).toEqual({ gap: '24px', paddingLeft: '24px', paddingRight: '24px' })

    await page.getByRole('link', { name: 'Adoção', exact: true }).click()
    await expect(page).toHaveURL(/\/adocao$/)
    await expect(page.getByRole('link', { name: 'Adoção', exact: true })).toHaveAttribute('aria-current', 'page')

    await page.getByRole('link', { name: 'Histórias', exact: true }).click()
    await expect(page).toHaveURL(/\/historias$/)

    await page.getByRole('link', { name: 'Ir para a página inicial' }).click()
    await expect(page).toHaveURL(/\/$/)

    await page.setViewportSize({ width: 1024, height: 844 })
    await expect(navigation).toBeHidden()
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
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
      .toBeLessThan(await copiar.evaluate((element) => element.getBoundingClientRect().width))
  })

  test('reserva números da rifa ativa e recebe o Pix', async ({ page }) => {
    const nomeDaReserva = `${MARCA_E2E} Reserva ${Date.now()}`
    await page.goto('/eventos')

    await page.getByRole('button', { name: `Reservar: ${RIFA_ATIVA}` }).click()
    const rifa = page.getByRole('dialog')
    await expect(rifa.getByRole('heading', { name: RIFA_ATIVA })).toBeVisible()
    const prizes = rifa.getByRole('region', { name: 'Prêmios da rifa' })
    const prizeCards = prizes.getByRole('article')
    await expect(prizes).toHaveCSS('overflow-x', 'auto')
    expect(await prizeCards.count()).toBeGreaterThan(1)
    const prizePositions = await prizeCards.evaluateAll((cards) => cards.slice(0, 2).map((card) => {
      const bounds = card.getBoundingClientRect()
      return { left: bounds.left, top: bounds.top }
    }))
    expect(prizePositions[1].left).toBeGreaterThan(prizePositions[0].left)
    expect(Math.abs(prizePositions[1].top - prizePositions[0].top)).toBeLessThanOrEqual(1)

    // A grade só renderiza depois que a disponibilidade chega do banco.
    await expect(rifa.getByText('Carregando números...')).toHaveCount(0)
    const disponiveis = rifa.getByRole('button', { name: /: disponível$/ })
    await expect(disponiveis.first()).toBeVisible()

    await expect(rifa.getByText('Selecione até 5 números por reserva.')).toBeVisible()
    const escolhidos = await disponiveis.evaluateAll((botoes) =>
      botoes.slice(0, 5).map((botao) => botao.getAttribute('aria-label') ?? ''),
    )
    expect(escolhidos).toHaveLength(5)
    for (const rotulo of escolhidos) {
      await rifa.getByRole('button', { name: rotulo }).click()
    }
    for (const rotulo of escolhidos) {
      const numero = rotulo.replace(': disponível', ': selecionado')
      await expect(rifa.getByRole('button', { name: numero })).toHaveAttribute('aria-pressed', 'true')
    }
    await expect(rifa.getByText('Você atingiu o limite de 5 números por reserva. Desmarque um número para escolher outro.')).toBeVisible()
    for (const rotulo of escolhidos.slice(2)) {
      await rifa.getByRole('button', { name: rotulo.replace(': disponível', ': selecionado') }).click()
    }

    await page.getByRole('button', { name: 'Finalizar sua reserva' }).click()

    const checkout = page.getByRole('dialog').filter({ hasText: 'Nome completo' })
    const selectedNumbers = checkout.getByText('Números escolhidos', { exact: true }).locator('xpath=following-sibling::dd')
    const raffleValue = checkout.getByText('Valor da rifa', { exact: true }).locator('xpath=following-sibling::dd')
    expect(Number.parseFloat(await selectedNumbers.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(24)
    expect(Number.parseFloat(await raffleValue.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(30)
    const customerName = checkout.getByLabel('Nome completo')
    await customerName.fill('Mario')
    await customerName.blur()
    await expect(checkout.getByRole('alert')).toHaveText('Informe pelo menos dois nomes.')
    await expect(checkout.getByRole('button', { name: 'Finalizar sua reserva' })).toBeDisabled()
    await customerName.fill(nomeDaReserva)
    await expect(checkout.getByText('Informe pelo menos dois nomes.')).toHaveCount(0)
    const mobile = checkout.getByLabel('Celular com DDD')
    await expect(checkout.getByRole('switch')).toHaveCount(0)
    await expect(checkout.getByRole('button', { name: 'Não tenho celular' })).toBeVisible()
    await mobile.fill('(16) 3333-4444')
    await mobile.blur()
    await expect(checkout.getByRole('alert')).toHaveText('Informe um celular com DDD.')

    await checkout.getByRole('button', { name: 'Não tenho celular' }).click()
    const email = checkout.getByLabel('E-mail')
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveValue('')
    await email.fill('reserva@example.com')
    await checkout.getByRole('button', { name: 'Colocar celular' }).click()
    await expect(checkout.getByLabel('Celular com DDD')).toHaveValue('')

    await checkout.getByLabel('Celular com DDD').fill('(16) 98765-4321')
    await checkout.getByRole('button', { name: 'Finalizar sua reserva' }).click()

    const confirmacao = page.getByRole('dialog').filter({ hasText: 'Reserva confirmada!' })
    await expect(confirmacao).toBeVisible()
    await expect(confirmacao.getByRole('img', { name: /QR Code do Pix/i })).toBeVisible()
    await expect(confirmacao.getByRole('button', { name: 'Copiar código PIX' })).toBeVisible()
    const closeButton = confirmacao.getByRole('button', { name: 'Fechar' })
    const closeBox = await closeButton.boundingBox()
    const viewport = page.viewportSize()
    expect(closeBox, 'botão Fechar do Pix invisível').not.toBeNull()
    expect(viewport, 'viewport indisponível').not.toBeNull()
    if (closeBox && viewport) expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(viewport.height)

    // O contato é normalizado por trigger: o E2E confirma o efeito no banco, não só na tela.
    const persistida = executarSql(
      `select status, customer_contact from public.reservas where customer_name = '${nomeDaReserva}'`,
    )
    expect(persistida).toBe('pendente|+5516987654321')
  })

  test('exibe somente o número sorteado e mantém o nome do ganhador privado', async ({ page }) => {
    executarSql(`update public.rifa_premios
      set winning_number = 20, winner_name = 'Maria Compradora', drawn_at = now()
      where id = 'a1100000-0000-0000-0000-000000000001'`)

    try {
      const prizesResponsePromise = page.waitForResponse((response) => response.url().includes('/rest/v1/rifa_premios_public'))
      await page.goto('/eventos')
      const prizesPayload = await (await prizesResponsePromise).json() as Record<string, unknown>[]
      expect(prizesPayload.every((prize) => !('winner_name' in prize))).toBe(true)

      await page.getByRole('button', { name: `Reservar: ${RIFA_ATIVA}` }).click()
      const firstPrize = page.getByRole('region', { name: 'Prêmios da rifa' }).getByRole('article').first()
      await expect(firstPrize).toContainText('Nº 20')
      await expect(firstPrize).not.toContainText('Maria Compradora')
    } finally {
      executarSql(`update public.rifa_premios
        set winning_number = null, winner_name = null, drawn_at = null
        where id = 'a1100000-0000-0000-0000-000000000001'`)
    }
  })
})
