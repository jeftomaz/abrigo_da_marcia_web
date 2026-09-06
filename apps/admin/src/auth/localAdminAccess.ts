const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321'
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export type LocalAdminCredentials = {
  email: string
  password: string
  totpSecret: string
}

function isLoopback(hostname: string) {
  return ['127.0.0.1', 'localhost', '::1'].includes(hostname)
}

export function getLocalAdminCredentials(): LocalAdminCredentials | null {
  if (!import.meta.env.DEV || !isLoopback(window.location.hostname)) return null

  const supabaseUrl = new URL(import.meta.env.VITE_SUPABASE_URL || LOCAL_SUPABASE_URL)
  const email = import.meta.env.VITE_LOCAL_ADMIN_EMAIL
  const password = import.meta.env.VITE_LOCAL_ADMIN_PASSWORD
  const totpSecret = import.meta.env.VITE_LOCAL_ADMIN_TOTP_SECRET
  if (
    supabaseUrl.protocol !== 'http:'
    || !isLoopback(supabaseUrl.hostname)
    || supabaseUrl.port !== '54321'
    || !email?.endsWith('@abrigo.local')
    || !password
    || !/^[A-Z2-7]+=*$/i.test(totpSecret ?? '')
  ) return null

  return { email, password, totpSecret }
}

function decodeBase32(secret: string) {
  let bits = ''
  for (const character of secret.replace(/=+$/, '').toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) throw new Error('Segredo TOTP local inválido.')
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = bits.match(/.{8}/g) ?? []
  return Uint8Array.from(bytes, (byte) => Number.parseInt(byte, 2))
}

export async function generateLocalTotp(secret: string, moment?: number) {
  let timestamp = moment ?? Date.now()
  if (moment === undefined) {
    const remainingSeconds = 30 - (Math.floor(timestamp / 1000) % 30)
    if (remainingSeconds < 5) {
      await new Promise((resolve) => setTimeout(resolve, remainingSeconds * 1000 + 500))
      timestamp = Date.now()
    }
  }
  const counter = BigInt(Math.floor(timestamp / 1000 / 30))
  const counterBytes = new ArrayBuffer(8)
  new DataView(counterBytes).setBigUint64(0, counter)
  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase32(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes))
  const offset = digest[digest.length - 1] & 0x0f
  const binary = (
    ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff)
  )
  return String(binary % 1_000_000).padStart(6, '0')
}
