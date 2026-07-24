function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

function normalizePixText(value: string, maxLength: number) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLength)
}

function crc16(payload: string) {
  let crc = 0xffff
  for (const character of payload) {
    crc ^= character.charCodeAt(0) << 8
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Monta o BR Code (EMV MPM) da especificação do Banco Central. `amount` omitido gera
// um Pix de valor livre (tag 54 ausente): serve tanto para doação quanto para eventos,
// sem o admin digitar o código pronto.
export function createPixCode(key: string, receiver: string, city: string, amount?: number) {
  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', key.trim())
  const payload = [
    field('00', '01'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'),
    ...(amount !== undefined ? [field('54', amount.toFixed(2))] : []),
    field('58', 'BR'),
    field('59', normalizePixText(receiver, 25)),
    field('60', normalizePixText(city, 15)),
    field('62', field('05', '***')),
    '6304',
  ].join('')
  return payload + crc16(payload)
}
