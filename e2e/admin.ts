import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { executarSql } from './banco'

// A conta administrativa de teste é criada e destruída pela suíte. As chaves saem de
// `supabase status`, nunca do repositório: nenhuma credencial fica versionada.
export const ADMIN_EMAIL = 'e2e-admin@abrigo.local'
export const ADMIN_SENHA = 'Senha-E2E-nao-reaproveitavel-9f2c'
export const INVITED_ADMIN_EMAIL = 'e2e-invited-admin@abrigo.local'

type Ambiente = { apiUrl: string; publishableKey: string; serviceRoleKey: string }

let ambiente: Ambiente | null = null

function lerAmbienteLocal(): Ambiente {
  if (ambiente) return ambiente
  const bruto = execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8' })
  const status = JSON.parse(bruto.slice(bruto.indexOf('{')))
  ambiente = {
    apiUrl: status.API_URL,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY,
    serviceRoleKey: status.SERVICE_ROLE_KEY,
  }
  return ambiente
}

export function ambientePublicoLocal() {
  const { apiUrl, publishableKey } = lerAmbienteLocal()
  return { apiUrl, publishableKey }
}

async function chamar(caminho: string, opcoes: RequestInit & { token?: string } = {}) {
  const { apiUrl, serviceRoleKey } = lerAmbienteLocal()
  const { token, headers, ...resto } = opcoes
  const resposta = await fetch(`${apiUrl}/auth/v1${caminho}`, {
    ...resto,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${token ?? serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...headers,
    },
  })
  const corpo = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw new Error(`${caminho} falhou (${resposta.status}): ${JSON.stringify(corpo)}`)
  }
  return corpo
}

function decodificarBase32(segredo: string) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const caractere of segredo.replace(/=+$/, '').toUpperCase()) {
    const indice = alfabeto.indexOf(caractere)
    if (indice === -1) continue
    bits += indice.toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Buffer.from(bytes.map((byte) => parseInt(byte, 2)))
}

// TOTP (RFC 6238) com os padrões que o Supabase usa: SHA-1, janela de 30s, 6 dígitos.
export function gerarCodigoTotp(segredo: string, momento = Date.now()) {
  const contador = Math.floor(momento / 1000 / 30)
  const buffer = Buffer.alloc(8)
  buffer.writeUInt32BE(Math.floor(contador / 2 ** 32), 0)
  buffer.writeUInt32BE(contador >>> 0, 4)

  const digest = createHmac('sha1', decodificarBase32(segredo)).update(buffer).digest()
  const deslocamento = digest[digest.length - 1] & 0x0f
  const binario = digest.readUInt32BE(deslocamento) & 0x7fffffff
  return String(binario % 1_000_000).padStart(6, '0')
}

// O código é recusado se a janela virar entre gerar e enviar; esperar a próxima
// janela é mais barato que lidar com uma falha intermitente.
export function codigoTotpComJanelaFolgada(segredo: string) {
  const restante = 30 - (Math.floor(Date.now() / 1000) % 30)
  if (restante < 5) return new Promise<string>((resolve) => {
    setTimeout(() => resolve(gerarCodigoTotp(segredo)), restante * 1000 + 500)
  })
  return Promise.resolve(gerarCodigoTotp(segredo))
}

export function removerAdminDeTeste() {
  executarSql(`delete from auth.users where email in ('${ADMIN_EMAIL}', '${INVITED_ADMIN_EMAIL}')`)
}

export async function convidarAdminDeTeste() {
  await chamar('/invite', {
    method: 'POST',
    body: JSON.stringify({ email: INVITED_ADMIN_EMAIL }),
  })
}

export async function provisionarAdmin() {
  removerAdminDeTeste()

  await chamar('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_SENHA,
      email_confirm: true,
      app_metadata: { role: 'admin', admin_onboarding_completed: true },
    }),
  })

  const sessao = await chamar('/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_SENHA }),
  })
  const token = sessao.access_token as string

  const fator = await chamar('/factors', {
    method: 'POST',
    token,
    body: JSON.stringify({ factor_type: 'totp', friendly_name: 'E2E' }),
  })
  const segredo = fator.totp.secret as string

  const desafio = await chamar(`/factors/${fator.id}/challenge`, { method: 'POST', token })
  const verificacao = await chamar(`/factors/${fator.id}/verify`, {
    method: 'POST',
    token,
    body: JSON.stringify({ challenge_id: desafio.id, code: await codigoTotpComJanelaFolgada(segredo) }),
  })

  return { accessToken: verificacao.access_token as string, email: ADMIN_EMAIL, senha: ADMIN_SENHA, segredo }
}
