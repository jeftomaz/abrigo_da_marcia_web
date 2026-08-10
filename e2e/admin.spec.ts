import AxeBuilder from '@axe-core/playwright'
import type { Locator, Page, Route } from '@playwright/test'
import { ADMIN_URL } from '../playwright.config'
import {
  ADMIN_NOME,
  ambientePublicoLocal,
  codigoTotpComJanelaFolgada,
  convidarAdminDeTeste,
  definirSenhaAdminDeTeste,
  gerarCodigoTotp,
  INVITED_ADMIN_EMAIL,
  provisionarAdmin,
  removerAdminDeTeste,
  removerPerfilAdminDeTeste,
} from './admin'
import { executarSql } from './banco'
import { expect, test } from './fixtures'

const PADROES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const FAMILIA_DA_MARCA = new Set(['#f15a55', '#fbd1d0', '#8d0e0c'])
const SUPERFICIES = new Set(['#ffffff', '#000000', '#e6e6e6', '#262626', '#404040'])
const EVENTO_PUBLICACAO_ID = 'e2000000-0000-0000-0000-000000000001'
const EVENTO_PUBLICACAO_NOME = 'Evento E2E para publicação'
const EVENTOS_HISTORICO_IDS = [
  'e2000000-0000-0000-0000-000000000002',
  'e2000000-0000-0000-0000-000000000003',
]

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

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const overflows = await page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'))
      .filter((dialog) => dialog.getClientRects().length > 0)
    const isContainedOverflow = (element: HTMLElement, boundary: HTMLElement) => {
      let parent = element.parentElement
      while (parent && parent !== boundary) {
        const overflowX = getComputedStyle(parent).overflowX
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX) && parent.scrollWidth > parent.clientWidth + 1) return true
        parent = parent.parentElement
      }
      return false
    }
    return [
      { label: 'página', clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, offenders: [] },
      ...dialogs.map((dialog) => {
        const offenders = Array.from(dialog.querySelectorAll<HTMLElement>('*'))
          .filter((element) => element.getClientRects().length > 0 && element.getBoundingClientRect().right > dialog.getBoundingClientRect().right + 1)
          .filter((element) => !isContainedOverflow(element, dialog))
          .slice(0, 5)
          .map((element) => ({
            className: element.className,
            tag: element.tagName,
            text: element.textContent?.trim().slice(0, 40),
          }))
        return {
          label: dialog.getAttribute('aria-label') ?? 'diálogo',
          clientWidth: dialog.clientWidth,
          scrollWidth: dialog.scrollWidth,
          offenders,
        }
      }),
    ].filter(({ clientWidth, scrollWidth, offenders }) => scrollWidth > clientWidth + 1 && (offenders.length > 0 || clientWidth === document.documentElement.clientWidth))
  })

  expect(overflows, context).toEqual([])
}

async function expectNoOverlap(first: Locator, second: Locator, context: string) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()])
  expect(firstBox, `${context}: primeiro elemento invisível`).not.toBeNull()
  expect(secondBox, `${context}: segundo elemento invisível`).not.toBeNull()
  if (!firstBox || !secondBox) return

  const overlaps = firstBox.x < secondBox.x + secondBox.width
    && firstBox.x + firstBox.width > secondBox.x
    && firstBox.y < secondBox.y + secondBox.height
    && firstBox.y + firstBox.height > secondBox.y
  expect(overlaps, context).toBe(false)
}

async function expectAlignedTop(controls: Locator[], context: string) {
  const boxes = await Promise.all(controls.map((control) => control.boundingBox()))
  boxes.forEach((box) => expect(box, `${context}: controle invisível`).not.toBeNull())
  const tops = boxes.flatMap((box) => box ? [box.y] : [])
  expect(Math.max(...tops) - Math.min(...tops), context).toBeLessThanOrEqual(2)
}

async function expectNoLabelControlOverlaps(scope: Locator, context: string) {
  const overlaps = await scope.locator('label[for]').evaluateAll((labels) => labels.flatMap((label) => {
    const control = document.getElementById((label as HTMLLabelElement).htmlFor)
    if (!control || (control as HTMLInputElement).type === 'file') return []
    const labelBox = label.getBoundingClientRect()
    const controlBox = control.getBoundingClientRect()
    if (controlBox.width <= 1 || controlBox.height <= 1) return []
    const overlap = labelBox.left < controlBox.right
      && labelBox.right > controlBox.left
      && labelBox.top < controlBox.bottom
      && labelBox.bottom > controlBox.top
    return overlap ? [label.textContent?.trim() || (label as HTMLLabelElement).htmlFor] : []
  }))

  expect(overlaps, context).toEqual([])
}

async function expectToRightOf(left: Locator, right: Locator, context: string) {
  const [leftBox, rightBox] = await Promise.all([left.boundingBox(), right.boundingBox()])
  expect(leftBox, `${context}: elemento à esquerda invisível`).not.toBeNull()
  expect(rightBox, `${context}: elemento à direita invisível`).not.toBeNull()
  if (!leftBox || !rightBox) return

  expect(rightBox.x, context).toBeGreaterThan(leftBox.x + leftBox.width)
}

function prepararEventoParaPublicacao(withFullHistory = false) {
  const historySql = withFullHistory ? EVENTOS_HISTORICO_IDS.map((id, index) => `
    insert into public.eventos (
      id, name, description, type, photos, start_date, end_date,
      fundraising_goal_cents, pix_key, pix_receiver, pix_city,
      post_payment_instructions, data_verified_at
    ) values (
      '${id}', 'Histórico E2E ${index + 1}', 'Evento encerrado criado pelo E2E.',
      'produtos', '{eventos/e2e/historico.jpg}', current_date - 1, current_date + 1,
      10000, 'pix-e2e@example.com', 'Abrigo E2E', 'São Paulo', 'Envie o comprovante.', now()
    );
    insert into public.produtos (
      id, event_id, name, description, photos, unit_price_cents, display_order
    ) values (
      'e2100000-0000-0000-0000-00000000000${index + 2}', '${id}', 'Produto E2E',
      'Produto criado pelo E2E.', '{eventos/e2e/produto.jpg}', 1000, 1
    );
    select public.activate_event('${id}');
    update public.eventos set status = 'encerrado' where id = '${id}';
  `).join('\n') : ''

  executarSql(`
    update public.eventos set status = 'encerrado'
    where id = 'a1000000-0000-0000-0000-000000000001' and status = 'ativo';
    update public.event_settings set event_export_email = ${withFullHistory ? "'e2e@example.com'" : 'null'} where singleton;
    insert into public.eventos (
      id, name, description, type, photos, start_date, end_date,
      fundraising_goal_cents, pix_key, pix_receiver, pix_city,
      post_payment_instructions, data_verified_at
    ) values (
      '${EVENTO_PUBLICACAO_ID}', '${EVENTO_PUBLICACAO_NOME}', 'Evento válido criado pelo E2E.',
      'produtos', '{eventos/e2e/capa.jpg}', current_date - 1, current_date + 1,
      10000, 'pix-e2e@example.com', 'Abrigo E2E', 'São Paulo', 'Envie o comprovante.', now()
    );
    insert into public.produtos (
      id, event_id, name, description, photos, unit_price_cents, display_order
    ) values (
      'e2100000-0000-0000-0000-000000000001', '${EVENTO_PUBLICACAO_ID}', 'Produto E2E',
      'Produto criado pelo E2E.', '{eventos/e2e/produto.jpg}', 1000, 1
    );
    ${historySql}
  `)
}

function limparEventoDePublicacao() {
  executarSql(`
    select set_config('app.confirmed_event_delete', 'on', false);
    delete from public.eventos where id in ('${EVENTO_PUBLICACAO_ID}', '${EVENTOS_HISTORICO_IDS.join("', '")}');
    update public.event_settings set event_export_email = null where singleton;
    select public.activate_event('a1000000-0000-0000-0000-000000000001')
    where not exists (select 1 from public.eventos where status = 'ativo');
  `)
}

async function mockActivateEvent(page: Page, response: {
  body?: Record<string, unknown>
  onSuccess?: () => void
  status?: number
} | 'network-error') {
  await page.route('**/functions/v1/activate-event', async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Origin': ADMIN_URL,
        },
      })
      return
    }
    if (response === 'network-error') {
      await route.abort('failed')
      return
    }
    response.onSuccess?.()
    await route.fulfill({
      status: response.status ?? 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': ADMIN_URL,
        'x-request-id': 'e2e-request-id',
      },
      body: JSON.stringify(response.body ?? { cleanupWarning: null }),
    })
  })
}

async function abrirConfirmacaoDePublicacao(page: Page) {
  await page.goto(`${ADMIN_URL}/#/eventos`)
  const eventCard = page.locator('article').filter({ hasText: EVENTO_PUBLICACAO_NOME })
  await expect(eventCard).toBeVisible()
  await eventCard.getByRole('button', { name: 'Publicar' }).click()
  const dialog = page.getByRole('dialog', { name: 'Publicar evento' })
  await expect(dialog).toBeVisible()
  return dialog
}

async function confirmarPublicacao(dialog: Locator) {
  await dialog.getByRole('button', { name: 'Publicar Evento' }).click()
}

function expectEventoComStatus(status: 'ativo' | 'rascunho') {
  expect(executarSql(`select status from public.eventos where id = '${EVENTO_PUBLICACAO_ID}'`)).toBe(status)
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
    await expect(page.getByText('A senha ainda não é válida.', { exact: true })).toBeVisible()
    await page.getByLabel('Nome ou apelido').fill('Convidada E2E')
    await page.getByLabel('Senha', { exact: true }).fill('Ab1!')
    await expect(page.getByText('A senha ainda não é válida.', { exact: true })).toBeVisible()
    await page.getByLabel('Senha', { exact: true }).fill(credenciais.senha)
    await expect(page.getByText('Senha válida.', { exact: true })).toBeVisible()
    await page.getByLabel('Confirmar senha').fill(`${credenciais.senha}x`)
    await expect(page.getByText('As senhas não coincidem.', { exact: true })).toBeVisible()
    await page.getByLabel('Confirmar senha').fill(credenciais.senha)
    await expect(page.getByText('As senhas coincidem.', { exact: true })).toBeVisible()
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
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        configurable: true,
        get: () => ({ readText: async () => '000 000' }),
      })
    })
    await page.goto(ADMIN_URL)
    await page.getByLabel('E-mail').fill(credenciais.email)
    await page.getByLabel('Senha', { exact: true }).fill(credenciais.senha)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.getByRole('button', { name: 'Colar' }).click()
    await expect(page.getByLabel('Código do autenticador')).toHaveValue('000000')
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

  test('recupera a senha por e-mail somente após confirmar o TOTP', async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'O envio de e-mail é coberto uma vez.')
    const newPassword = 'Senha-Nova-Recuperacao-E2E-7!'

    try {
      await page.goto(ADMIN_URL)
      await page.getByRole('button', { name: 'Esqueci a senha' }).click()
      await expect(page.getByRole('heading', { name: 'Recuperar senha' })).toBeVisible()
      await page.getByLabel('E-mail').fill(credenciais.email)
      await page.getByRole('button', { name: 'Enviar link de recuperação' }).click()
      await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()

      const mensagens = await request.get('http://127.0.0.1:54324/api/v1/messages')
      const { messages } = await mensagens.json()
      const mensagem = messages
        .filter((item: { To: Array<{ Address: string }> }) =>
          item.To.some((recipient) => recipient.Address === credenciais.email))
        .sort((left: { Created: string }, right: { Created: string }) => right.Created.localeCompare(left.Created))[0]
      const email = await request.get(`http://127.0.0.1:54324/view/${mensagem.ID}.html`)
      const html = await email.text()
      const recoveryUrl = html.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
      if (!recoveryUrl) throw new Error('Link de recuperação não encontrado.')

      await page.goto(recoveryUrl)
      await expect(page.getByRole('heading', { name: 'Confirme sua identidade' })).toBeVisible()
      await expect(page.getByLabel('Nova senha')).toHaveCount(0)
      await page.getByLabel('Código do autenticador').fill(await codigoTotpComJanelaFolgada(credenciais.segredo))
      await page.getByRole('button', { name: 'Verificar' }).click()

      await expect(page.getByRole('heading', { name: 'Redefinir senha' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toHaveCount(0)
      await expect(page.getByText('A senha ainda não é válida.', { exact: true })).toBeVisible()
      await page.getByLabel('Nova senha', { exact: true }).fill(newPassword)
      await expect(page.getByText('Senha válida.', { exact: true })).toBeVisible()
      await page.getByLabel('Confirmar nova senha').fill(newPassword)
      await expect(page.getByText('As senhas coincidem.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Salvar nova senha' }).click()
      await expect(page.getByText('Senha alterada. Entre novamente com a nova senha.')).toBeVisible()
    } finally {
      await definirSenhaAdminDeTeste(credenciais.senha)
    }
  })

  test('altera a senha nas Configurações após uma nova confirmação TOTP', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'O fluxo funcional é coberto uma vez.')
    const newPassword = 'Senha-Nova-Configuracoes-E2E-8!'

    try {
      await entrar(page)
      await page.goto(`${ADMIN_URL}/#/configuracoes`)
      await page.getByRole('button', { name: 'Alterar senha' }).click()
      const dialog = page.getByRole('dialog', { name: 'Alterar senha' })
      await expect(dialog.getByRole('heading', { name: 'Confirmar alteração de senha' })).toBeVisible()
      await expect(dialog.getByLabel('Nova senha')).toHaveCount(0)
      await dialog.getByLabel('Código do autenticador').fill(gerarCodigoTotp(credenciais.segredo, Date.now() + 30_000))
      await dialog.getByRole('button', { name: 'Verificar' }).click()

      await expect(dialog.getByRole('heading', { name: 'Alterar senha' })).toBeVisible()
      await dialog.getByLabel('Nova senha', { exact: true }).fill(newPassword)
      await dialog.getByLabel('Confirmar nova senha').fill(newPassword)
      await dialog.getByRole('button', { name: 'Alterar senha' }).click()
      await expect(page.getByText('Senha alterada.', { exact: true })).toBeVisible()
    } finally {
      await definirSenhaAdminDeTeste(credenciais.senha)
    }
  })

  test('navega entre as gestões e encerra a sessão', async ({ page }) => {
    await entrar(page)

    for (const aba of ['Histórias', 'Eventos', 'Configurações']) {
      await page.getByRole('link', { name: aba }).click()
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }

    await page.getByRole('button', { name: 'Sair' }).click()
    const signOutConfirmation = page.getByRole('dialog', { name: 'Sair da área administrativa' })
    await expect(signOutConfirmation).toContainText('Será necessário entrar novamente com senha e código do autenticador.')
    await signOutConfirmation.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('heading', { name: 'Configurações', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).click()
    await page.getByRole('dialog', { name: 'Sair da área administrativa' }).getByRole('button', { name: 'Sair' }).click()
    await expect(page.getByRole('heading', { name: 'Acesso administrativo' })).toBeVisible()
  })

  test('oferece exclusão auditada para evento encerrado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'O fluxo visual é coberto uma vez.')
    await entrar(page)
    await page.goto(`${ADMIN_URL}/#/eventos`)

    const endedEvent = page.locator('article').filter({ hasText: 'Bazar de Inverno' })
    await endedEvent.getByRole('button', { name: 'Excluir' }).click()

    const confirmation = page.getByRole('dialog', { name: 'Excluir evento' })
    await expect(confirmation.getByRole('heading', { name: 'Excluir Evento' })).toBeVisible()
    await expect(confirmation).toContainText('A exportação será enviada automaticamente ao e-mail configurado antes da exclusão definitiva.')
    await expect(confirmation.getByRole('button', { name: 'Excluir Evento' })).toBeVisible()
    await confirmation.getByRole('button', { name: 'Cancelar' }).click()
    await expect(confirmation).toBeHidden()
  })

  test('confirma pagamento por status ou após salvar o comprovante', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'O fluxo funcional é coberto uma vez.')
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', {
        configurable: true,
        get: () => ({ writeText: async (value: string) => sessionStorage.setItem('e2e-clipboard', value) }),
      })
    })
    executarSql(`update public.eventos set receipt_folder_url = 'https://example.com/comprovantes-e2e' where id = 'a1000000-0000-0000-0000-000000000001';
      update public.reservas set status = 'pendente', expires_at = now() + interval '15 minutes'
      where session_id = 'a1200000-0000-0000-0000-000000000001'`)

    try {
      await entrar(page)
      await page.goto(`${ADMIN_URL}/#/eventos`)
      const raffleCard = page.locator('article').filter({ hasText: 'Rifa de Inverno' })
      const reservationsButton = raffleCard.getByRole('button', { name: 'Reservas' })
      const inactiveBackground = await reservationsButton.evaluate((element) => getComputedStyle(element).backgroundColor)
      await reservationsButton.click()

      await expect(reservationsButton).toHaveAttribute('aria-pressed', 'true')
      expect(await reservationsButton.evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(inactiveBackground)
      const receiptFolderLink = page.getByRole('link', { name: 'Pasta de comprovantes', exact: true })
      await expect(receiptFolderLink).toHaveCount(1)
      await expect(receiptFolderLink).toHaveAttribute('href', 'https://example.com/comprovantes-e2e')
      const [managementBox, receiptFolderBox] = await Promise.all([
        receiptFolderLink.locator('xpath=ancestor::section[1]').boundingBox(),
        receiptFolderLink.boundingBox(),
      ])
      expect(managementBox, 'gestão de reservas invisível').not.toBeNull()
      expect(receiptFolderBox, 'pasta de comprovantes invisível').not.toBeNull()
      expect((receiptFolderBox?.x ?? 0) + (receiptFolderBox?.width ?? 0), 'pasta de comprovantes extrapola a gestão').toBeLessThanOrEqual((managementBox?.x ?? 0) + (managementBox?.width ?? 0))

      const pendingReservation = page.locator('article').filter({ hasText: 'Fulano Pendente' })
      const referenceCode = executarSql("select reference_code from public.reservas where session_id = 'a1200000-0000-0000-0000-000000000001'")
      expect(referenceCode).toMatch(/^[0-9A-F]{12}$/)
      await pendingReservation.getByRole('button', { name: `Copiar código da reserva ${referenceCode}` }).click()
      expect(await page.evaluate(() => sessionStorage.getItem('e2e-clipboard'))).toBe(referenceCode)
      await expect(pendingReservation.getByRole('status')).toHaveText('Código da reserva copiado.')
      await expect(pendingReservation.getByRole('link', { name: /Pasta de comprovantes/ })).toHaveCount(0)

      await page.getByLabel('Alterar status da reserva de Fulano Pendente').selectOption('paid')
      const confirmation = page.getByRole('dialog', { name: 'Confirmar pagamento' })
      await expect(confirmation.getByRole('button', { name: 'Cancelar' })).toBeVisible()
      await expect(confirmation.getByRole('button', { name: 'Sim, foi salvo' })).toBeVisible()
      await expect(confirmation.getByRole('link', { name: /pasta de comprovantes/i })).toHaveCount(0)
      await confirmation.getByRole('button', { name: 'Cancelar' }).click()

      await pendingReservation.getByLabel('Comprovante salvo').click()
      const receiptConfirmation = page.getByRole('dialog', { name: 'Confirmar pagamento' })
      await expect(receiptConfirmation.getByRole('heading', { name: 'Marcar também como paga?' })).toBeVisible()
      await expect(receiptConfirmation).toContainText('O comprovante foi salvo.')
      await receiptConfirmation.getByRole('button', { name: 'Marcar como paga' }).click()
      await expect.poll(() => executarSql("select status || '|' || receipt_saved from public.reservas where session_id = 'a1200000-0000-0000-0000-000000000001'")).toBe('paga|true')
    } finally {
      executarSql("update public.eventos set receipt_folder_url = null where id = 'a1000000-0000-0000-0000-000000000001'; update public.reservas set status = 'pendente', receipt_saved = false, expires_at = now() + interval '15 minutes' where session_id = 'a1200000-0000-0000-0000-000000000001'")
    }
  })

  test('leva a reserva vencedora ao topo e a destaca após o sorteio', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'O fluxo funcional é coberto uma vez.')
    executarSql(`
      update public.rifa_premios set winning_number = null, winner_name = null, drawn_at = null
      where event_id = 'a1000000-0000-0000-0000-000000000001';
      update public.reservas set status = 'pendente'
      where session_id = 'a1200000-0000-0000-0000-000000000001';
      update public.reservas set status = 'paga'
      where session_id = 'a1200000-0000-0000-0000-000000000002';
    `)

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await entrar(page)
      await page.goto(`${ADMIN_URL}/#/eventos/a1000000-0000-0000-0000-000000000001/sorteio`)
      await page.getByRole('button', { name: 'Sortear pela esfera', exact: true }).click()
      const shortageWarning = page.getByRole('dialog', { name: 'Reservas insuficientes para o sorteio' })
      await expect(shortageWarning).toContainText('Há 1 reserva paga ainda elegível para 2 prêmios não sorteados.')
      await shortageWarning.getByRole('button', { name: 'Iniciar sorteio' }).click()
      await expect(page.getByText('Maria Compradora', { exact: true })).toBeVisible()

      await page.reload()
      await expect(page.getByText('Sorteio', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Sortear', exact: true }).click()
      const noEligibleReservationWarning = page.getByRole('dialog', { name: 'Reservas insuficientes para o sorteio' })
      await expect(noEligibleReservationWarning).toContainText('Há 0 reservas pagas ainda elegíveis para 1 prêmio não sorteado.')
      await expect(noEligibleReservationWarning.getByRole('button', { name: 'Iniciar sorteio' })).toHaveCount(0)
      expect(executarSql("select count(*) from public.rifa_premios where event_id = 'a1000000-0000-0000-0000-000000000001' and winning_number is not null")).toBe('1')
      await noEligibleReservationWarning.getByRole('button', { name: 'Entendi' }).click()

      await page.getByRole('link', { name: 'Voltar' }).click()
      const raffleCard = page.locator('article').filter({ hasText: 'Rifa de Inverno' })
      await raffleCard.getByRole('button', { name: 'Reservas' }).click()

      const management = page.getByRole('heading', { name: 'Reservas', exact: true }).locator('xpath=ancestor::section[1]')
      const reservationRows = management.locator('article')
      const winnerRow = reservationRows.filter({ hasText: 'Maria Compradora' })
      const otherRow = reservationRows.filter({ hasText: 'Fulano Pendente' })
      await expect(reservationRows.first()).toContainText('Maria Compradora')
      const winnerBadge = winnerRow.getByText('Ganhador', { exact: true })
      await expect(winnerBadge).toBeVisible()
      await expect(winnerRow).toHaveCSS('background-color', 'rgb(251, 209, 208)')
      await expect(winnerRow).toHaveCSS('border-color', 'rgb(141, 14, 12)')
      await expect(winnerBadge).toHaveCSS('background-color', 'rgb(141, 14, 12)')
      expect(await winnerRow.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe(await otherRow.evaluate((element) => getComputedStyle(element).backgroundColor))
    } finally {
      executarSql(`update public.rifa_premios set winning_number = null, winner_name = null, drawn_at = null
        where event_id = 'a1000000-0000-0000-0000-000000000001'`)
    }
  })

  test('alerta antes do sorteio quando há menos reservas pagas do que prêmios', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'O gesto mobile é coberto uma vez.')
    executarSql(`
      update public.rifa_premios set winning_number = null, winner_name = null, drawn_at = null
      where event_id = 'a1000000-0000-0000-0000-000000000001';
      update public.reservas set status = 'pendente'
      where session_id = 'a1200000-0000-0000-0000-000000000001';
      update public.reservas set status = 'paga'
      where session_id = 'a1200000-0000-0000-0000-000000000002';
    `)
    await entrar(page)
    await page.goto(`${ADMIN_URL}/#/eventos`)
    const raffleCard = page.locator('article').filter({ hasText: 'Rifa de Inverno' })
    await raffleCard.getByRole('button', { name: 'Sortear' }).click()
    await expect(page.getByText('Sorteio', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Sortear pela esfera', exact: true }).tap()

    const warning = page.getByRole('dialog', { name: 'Reservas insuficientes para o sorteio' })
    await expect(warning.getByRole('heading', { name: 'Reservas pagas insuficientes' })).toBeVisible()
    await expect(warning).toContainText('Há 1 reserva paga ainda elegível para 2 prêmios não sorteados.')
    await expect(warning.getByRole('button', { name: 'Iniciar sorteio' })).toBeVisible()
    expect(executarSql("select count(*) from public.rifa_premios where event_id = 'a1000000-0000-0000-0000-000000000001' and winning_number is not null")).toBe('0')
  })

  test('mantém o botão de sorteio no primeiro viewport mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'O ajuste é exclusivo do layout mobile.')
    await page.setViewportSize({ width: 320, height: 844 })
    await entrar(page)
    await page.goto(`${ADMIN_URL}/#/eventos/a1000000-0000-0000-0000-000000000001/sorteio`)

    await expect(page.getByRole('button', { name: 'Sortear pela esfera', exact: true })).toBeEnabled()
    const drawButton = page.getByRole('button', { name: 'Sortear', exact: true })
    await expect(drawButton).toBeVisible()
    const drawButtonBox = await drawButton.boundingBox()
    expect(drawButtonBox, 'botão de sorteio invisível').not.toBeNull()
    expect((drawButtonBox?.y ?? 844) + (drawButtonBox?.height ?? 0), 'botão de sorteio exige rolagem inicial').toBeLessThanOrEqual(844)
    await expectNoHorizontalOverflow(page, 'Sorteio em 320px')
  })

  test('gestão de Cães passa na auditoria nos dois temas', async ({ page }) => {
    await entrar(page)
    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
    expect(await auditar(page)).toEqual([])

    await page.getByRole('button', { name: 'Ativar tema escuro' }).click()
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))))
    expect(await auditar(page)).toEqual([])
  })

  test('preserva os dados e informa o erro ao criar uma rifa', async ({ page }) => {
    const raffleName = 'Rifa E2E com falha'
    await page.route('**/rest/v1/eventos*', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': ADMIN_URL },
        body: JSON.stringify({
          code: 'P0001',
          message: 'Falha E2E ao criar a rifa.',
        }),
      })
    })

    await entrar(page)
    await page.goto(`${ADMIN_URL}/#/eventos`)
    await page.getByRole('button', { name: 'Novo Evento' }).click()
    const form = page.getByRole('dialog', { name: 'Novo Evento' })
    await expect(form).toBeVisible()

    await form.getByLabel('Tipo').selectOption('raffle')
    await form.getByLabel('Título').fill(raffleName)
    await form.getByLabel('Descrição').fill('Rifa preenchida para validar a preservação do formulário.')
    await form.getByLabel('Data de fim').fill(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
    await form.getByLabel('Quantidade de números*').fill('100')
    await form.getByLabel('Valor por número (R$)*').fill('1000')
    await form.getByLabel('Chave PIX').fill('pix-e2e@example.com')
    await form.getByLabel('Nome do recebedor').fill('Abrigo E2E')
    await form.getByLabel('Cidade do recebedor').fill('São Paulo')
    await form.getByLabel('Instruções pós-pagamento').fill('Envie o comprovante.')
    await form.locator('input[type="file"]').setInputFiles('supabase/seed-storage/eventos/rifa-teste/capa.jpg')
    await expect(form.getByText('Galeria de Divulgação (1/5)')).toBeVisible()

    await form.getByRole('button', { name: 'Adicionar prêmio' }).click()
    const prizeDialog = page.getByRole('dialog', { name: 'Adicionar prêmio' })
    await prizeDialog.getByLabel('Nome do Prêmio').fill('Prêmio E2E')
    await prizeDialog.locator('input[type="file"]').setInputFiles('supabase/seed-storage/eventos/rifa-teste/premio-1.jpg')
    await expect(prizeDialog.getByRole('button', { name: 'Salvar Prêmio' })).toBeEnabled()
    await prizeDialog.getByRole('button', { name: 'Salvar Prêmio' }).click()
    await expect(prizeDialog).toBeHidden()

    const saveButton = form.getByRole('button', { name: 'Salvar Evento' })
    await expect(saveButton).toBeEnabled()
    await saveButton.click()
    const confirmation = page.getByRole('dialog', { name: 'Confirmar verificação' })
    await confirmation.getByRole('button', { name: 'Confirmar' }).click()

    await expect(form.getByRole('alert')).toContainText('Não foi possível salvar o evento: Falha E2E ao criar a rifa.')
    await expect(form).toBeVisible()
    await expect(form.getByLabel('Título')).toHaveValue(raffleName)
    await expect(form.getByLabel('Tipo')).toHaveValue('raffle')
    await expect(form.getByText('Prêmio E2E', { exact: true })).toBeVisible()
    expect(executarSql(`select count(*) from public.eventos where name = '${raffleName}'`)).toBe('0')
  })

  test.describe('publicação de evento', () => {
    test.beforeEach(() => {
      limparEventoDePublicacao()
      prepararEventoParaPublicacao()
    })

    test.afterEach(() => {
      limparEventoDePublicacao()
    })

    test('publica o rascunho com sucesso', async ({ page }) => {
      await mockActivateEvent(page, {
        onSuccess: () => executarSql(`select public.activate_event('${EVENTO_PUBLICACAO_ID}')`),
      })
      await entrar(page)
      const dialog = await abrirConfirmacaoDePublicacao(page)
      await confirmarPublicacao(dialog)

      await expect(dialog).toBeHidden()
      await expect(page.getByText('Evento publicado.', { exact: true })).toBeVisible()
      expectEventoComStatus('ativo')
    })

    test('preserva o rascunho quando a função devolve falha HTTP', async ({ page }) => {
      await mockActivateEvent(page, {
        status: 500,
        body: {
          code: 'DATABASE_ERROR',
          message: 'O banco recusou a publicação.',
          requestId: 'http-error-id',
        },
      })
      await entrar(page)
      const dialog = await abrirConfirmacaoDePublicacao(page)
      await confirmarPublicacao(dialog)

      await expect(dialog.getByRole('alert')).toContainText('O banco recusou a publicação. Referência: http-error-id.')
      await expect(dialog).toBeVisible()
      expectEventoComStatus('rascunho')
    })

    test('traduz falha de rede ou CORS e preserva o rascunho', async ({ page }) => {
      await mockActivateEvent(page, 'network-error')
      await entrar(page)
      const dialog = await abrirConfirmacaoDePublicacao(page)
      await confirmarPublicacao(dialog)

      await expect(dialog.getByRole('alert')).toContainText('Não foi possível alcançar a operação administrativa. Verifique a conexão e a configuração CORS.')
      await expect(dialog).toBeVisible()
      expectEventoComStatus('rascunho')
    })

    test('informa sessão expirada e preserva o rascunho', async ({ page }) => {
      await mockActivateEvent(page, {
        status: 401,
        body: {
          code: 'SESSION_REQUIRED',
          message: 'Sua sessão administrativa expirou. Entre novamente.',
          requestId: 'session-error-id',
        },
      })
      await entrar(page)
      const dialog = await abrirConfirmacaoDePublicacao(page)
      await confirmarPublicacao(dialog)

      await expect(dialog.getByRole('alert')).toContainText('Sua sessão administrativa expirou. Entre novamente. Referência: session-error-id.')
      await expect(dialog).toBeVisible()
      expectEventoComStatus('rascunho')
    })

    test('preserva evento e histórico quando a exportação falha', async ({ page }) => {
      limparEventoDePublicacao()
      prepararEventoParaPublicacao(true)
      await mockActivateEvent(page, {
        status: 502,
        body: {
          code: 'RESEND_ERROR',
          message: 'O serviço de e-mail recusou a exportação. Nada foi excluído.',
          requestId: 'export-error-id',
        },
      })
      await entrar(page)
      const dialog = await abrirConfirmacaoDePublicacao(page)
      await expect(dialog).toContainText('Este será o quinto evento ativado.')
      await confirmarPublicacao(dialog)

      await expect(dialog.getByRole('alert')).toContainText('O serviço de e-mail recusou a exportação. Nada foi excluído. Referência: export-error-id.')
      await expect(dialog).toBeVisible()
      expectEventoComStatus('rascunho')
      expect(Number(executarSql("select count(*) from public.eventos where status <> 'rascunho'"))).toBe(4)
    })
  })

  test('grids do admin não transbordam nem sobrepõem controles entre 320 e 430 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 })
    await entrar(page)
    await expect(page.getByRole('heading', { name: 'Cães Cadastrados' })).toBeVisible()
    const navigationBox = await page.getByRole('navigation').boundingBox()
    expect(navigationBox?.x).toBe(0)
    expect(navigationBox?.width).toBe(320)

    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 844 })
      for (const [path, heading] of [
        ['/', 'Cães Cadastrados'],
        ['/historias', 'Histórias Contadas'],
        ['/eventos', 'Eventos'],
        ['/configuracoes', 'Configurações'],
      ] as const) {
        await page.goto(`${ADMIN_URL}/#${path}`)
        const pageHeading = page.getByRole('heading', { name: heading, exact: true })
        await expect(pageHeading).toBeVisible()
        await expectNoHorizontalOverflow(page, `${heading} em ${width}px`)
        if (heading === 'Cães Cadastrados') {
          await expectNoOverlap(pageHeading, page.getByLabel('Filtrar por status'), `${heading}: título e filtro em ${width}px`)
          await expectNoOverlap(pageHeading, page.getByRole('button', { name: 'Novo Cão' }), `${heading}: título e ação em ${width}px`)
          const dogCard = page.getByRole('button', { name: 'Editar' }).first().locator('xpath=ancestor::article[1]')
          await expectToRightOf(dogCard.getByRole('img').first(), dogCard.getByRole('button', { name: 'Editar' }), `${heading}: ações ao lado da foto em ${width}px`)
        }
        if (heading === 'Histórias Contadas') {
          await expectNoOverlap(pageHeading, page.getByLabel('Filtrar histórias por publicação'), `${heading}: título e filtro em ${width}px`)
          await expectNoOverlap(pageHeading, page.getByRole('button', { name: 'Nova História' }), `${heading}: título e ação em ${width}px`)
          const storyCard = page.getByRole('button', { name: 'Editar' }).first().locator('xpath=ancestor::article[1]')
          await expectToRightOf(storyCard.getByRole('img').first(), storyCard.getByRole('button', { name: 'Editar' }), `${heading}: ações ao lado da foto em ${width}px`)
        }
        if (heading === 'Eventos') {
          await expectNoOverlap(pageHeading, page.getByRole('button', { name: 'Novo Evento' }), `${heading}: título e ação em ${width}px`)
        }
      }
    }

    await page.setViewportSize({ width: 320, height: 844 })

    await page.goto(`${ADMIN_URL}/#/`)
    await page.getByRole('button', { name: 'Novo Cão' }).click()
    await expect(page.getByRole('dialog', { name: 'Novo Cão' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Formulário de Cães em 320px')
    await page.getByRole('dialog', { name: 'Novo Cão' }).getByRole('button', { name: 'Cancelar' }).click()

    await page.goto(`${ADMIN_URL}/#/historias`)
    await page.getByRole('button', { name: 'Nova História' }).click()
    await expect(page.getByRole('dialog', { name: 'Nova História' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Formulário de Histórias em 320px')
    await page.getByRole('dialog', { name: 'Nova História' }).getByRole('button', { name: 'Cancelar' }).click()

    await page.goto(`${ADMIN_URL}/#/eventos`)
    await page.getByRole('button', { name: 'Novo Evento' }).click()
    const eventDialog = page.getByRole('dialog', { name: 'Novo Evento' })
    await expect(eventDialog).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Formulário de Eventos em 320px')
    await eventDialog.getByLabel('Tipo').selectOption('raffle')
    await expectAlignedTop(
      [eventDialog.getByLabel('Tipo'), eventDialog.getByLabel('Título')],
      'Geral do formulário de Eventos em 320px',
    )
    const startDate = eventDialog.getByLabel('Data de início')
    const endDate = eventDialog.getByLabel('Data de fim')
    const fundraisingGoal = eventDialog.getByLabel('Arrecadação (R$)')
    await expectNoOverlap(startDate, endDate, 'Datas do formulário de Eventos em 320px')
    await expectNoOverlap(endDate, fundraisingGoal, 'Fim e arrecadação do formulário de Eventos em 320px')
    await expect(eventDialog.getByLabel('Expiração da reserva')).toHaveValue('15')

    const raffleTotal = eventDialog.getByLabel('Quantidade de números*')
    const rafflePrice = eventDialog.getByLabel('Valor por número (R$)*')
    await fundraisingGoal.fill('100000')
    await raffleTotal.fill('100')
    await expect(rafflePrice).toHaveValue('10,00')
    await rafflePrice.fill('2000')
    await expect(raffleTotal).toHaveValue('50')
    await expect(fundraisingGoal).toHaveValue('1.000,00')
    await raffleTotal.fill('40')
    await expect(rafflePrice).toHaveValue('25,00')
    await expect(fundraisingGoal).toHaveValue('1.000,00')
    await expectAlignedTop(
      [eventDialog.getByLabel('Quantidade de números*'), eventDialog.getByLabel('Valor por número (R$)*'), eventDialog.getByLabel('Máx. por reserva')],
      'Detalhes da rifa em 320px',
    )
    await expectAlignedTop(
      [eventDialog.getByLabel('Chave PIX'), eventDialog.getByLabel('Cidade do recebedor')],
      'Pagamento do formulário de Eventos em 320px',
    )
    await expectNoLabelControlOverlaps(eventDialog, 'Rótulos do formulário de Eventos em 320px')
    await eventDialog.getByRole('button', { name: 'Cancelar' }).click()

    const bazaarCard = page.locator('article').filter({ hasText: 'Bazar de Inverno' })
    await bazaarCard.getByRole('button', { name: 'Editar' }).click()
    const savedEventDialog = page.getByRole('dialog', { name: 'Editar Evento' })
    await expect(savedEventDialog).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Variações de produto em 320px')
    await expectNoLabelControlOverlaps(savedEventDialog, 'Rótulos do produto em 320px')
    await savedEventDialog.getByRole('button', { name: 'Cancelar' }).click()

    await bazaarCard.getByRole('button', { name: 'Reservas' }).click()
    const reservations = page.getByRole('heading', { name: 'Reservas', exact: true }).locator('xpath=ancestor::section[1]')
    await expect(reservations).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Gestão de reservas em 320px')
    await reservations.getByRole('button', { name: 'Editar' }).first().click()
    await expect(page.getByRole('dialog', { name: 'Editar reserva' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Edição de reserva em 320px')
    await page.getByRole('dialog', { name: 'Editar reserva' }).getByRole('button', { name: 'Fechar' }).click()

    await page.goto(`${ADMIN_URL}/#/configuracoes`)
    const eventSettings = page.getByLabel('Gestão de Eventos', { exact: true })
    await eventSettings.getByRole('button', { name: 'Editar' }).click()
    await expect(page.getByRole('dialog', { name: 'Editar configurações' })).toBeVisible()
    await expectNoHorizontalOverflow(page, 'Configurações de Eventos em 320px')

    await page.setViewportSize({ width: 1360, height: 900 })
    await page.goto(`${ADMIN_URL}/#/eventos`)
    await page.locator('article').filter({ hasText: 'Bazar de Inverno' }).getByRole('button', { name: 'Editar' }).click()
    const panelForm = page.getByRole('heading', { name: 'Editar Evento' }).locator('xpath=ancestor::form[1]')
    await expect(panelForm).toBeVisible()
    await expectAlignedTop(
      [panelForm.getByRole('heading', { name: 'Imagens', exact: true }), panelForm.getByRole('heading', { name: 'Geral', exact: true })],
      'Seções iniciais do painel desktop de Eventos',
    )
    await expectNoOverlap(panelForm.getByLabel('Data de início'), panelForm.getByLabel('Data de fim'), 'Datas do painel desktop de Eventos')
    await expectNoOverlap(panelForm.getByLabel('Data de fim'), panelForm.getByLabel('Arrecadação (R$)'), 'Fim e arrecadação do painel desktop de Eventos')
    await expectAlignedTop(
      [panelForm.getByLabel('Chave PIX'), panelForm.getByLabel('Cidade do recebedor')],
      'Pagamento do painel desktop de Eventos',
    )
    await expectNoLabelControlOverlaps(panelForm, 'Rótulos do painel desktop de Eventos')

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Eventos', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Novo Evento' }).click()
    const rafflePanelForm = page.getByRole('heading', { name: 'Novo Evento' }).locator('xpath=ancestor::form[1]')
    await rafflePanelForm.getByLabel('Tipo').selectOption('raffle')
    await expectAlignedTop(
      [rafflePanelForm.getByLabel('Quantidade de números*'), rafflePanelForm.getByLabel('Valor por número (R$)*'), rafflePanelForm.getByLabel('Máx. por reserva')],
      'Detalhes da rifa no painel desktop',
    )
    await expectNoLabelControlOverlaps(rafflePanelForm, 'Rótulos da rifa no painel desktop')
  })
})
