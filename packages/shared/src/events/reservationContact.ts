export type ReservationContactType = 'email' | 'mobile' | 'phone'

const BRAZIL_AREA_CODES = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
])

const EMAIL_LOCAL_PATTERN = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+$/
const EMAIL_DOMAIN_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/

function brazilNationalDigits(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
    ? digits.slice(2)
    : digits
}

function phoneError(value: string, mobileOnly = false) {
  const national = brazilNationalDigits(value)
  if (mobileOnly && national.length !== 11) return 'Informe um celular com DDD.'
  if (!mobileOnly && national.length !== 10 && national.length !== 11) return 'Informe um telefone com DDD.'
  if (!BRAZIL_AREA_CODES.has(national.slice(0, 2))) return 'Informe um DDD válido.'
  const subscriber = national.slice(2)
  if ([...subscriber].every((digit) => digit === subscriber[0])) return 'Este número parece fictício.'
  if (national.length === 11 && subscriber[0] !== '9') return 'Celulares devem começar com 9 após o DDD.'
  if (national.length === 10 && !/^[2-5]/.test(subscriber)) return 'Informe um telefone fixo ou celular válido.'
  return null
}

function emailError(value: string) {
  const email = value.trim()
  if (email.length > 254) return 'O e-mail informado é muito longo.'
  const parts = email.split('@')
  if (parts.length !== 2) return 'Informe um e-mail completo, como nome@dominio.com.'
  const [local, domain] = parts
  if (!local || local.length > 64 || !EMAIL_LOCAL_PATTERN.test(local) || local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return 'Informe um e-mail válido antes do @.'
  }
  const labels = domain.split('.')
  if (labels.length < 2 || labels.some((label) => !EMAIL_DOMAIN_LABEL_PATTERN.test(label))) {
    return 'Informe um domínio completo, como dominio.com.'
  }
  const topLevelDomain = labels.at(-1) ?? ''
  if (!/^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/.test(topLevelDomain)) {
    return 'Informe um domínio de e-mail válido.'
  }
  return null
}

export function getReservationContactError(type: ReservationContactType, value: string) {
  if (!value.trim()) {
    if (type === 'email') return 'Informe um e-mail para contato.'
    return type === 'mobile' ? 'Informe um celular para contato.' : 'Informe um telefone para contato.'
  }
  return type === 'email' ? emailError(value) : phoneError(value, type === 'mobile')
}

export function normalizeReservationContact(type: ReservationContactType, value: string) {
  if (type !== 'email') return `+55${brazilNationalDigits(value)}`
  const email = value.trim()
  const atIndex = email.lastIndexOf('@')
  return `${email.slice(0, atIndex)}@${email.slice(atIndex + 1).toLocaleLowerCase('en-US')}`
}

export function formatBrazilPhoneInput(value: string) {
  const digits = brazilNationalDigits(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const areaCode = digits.slice(0, 2)
  const subscriber = digits.slice(2)
  const prefixLength = subscriber.length > 8 ? 5 : 4
  const prefix = subscriber.slice(0, prefixLength)
  const suffix = subscriber.slice(prefixLength)
  return `(${areaCode}) ${prefix}${suffix ? `-${suffix}` : ''}`
}

export function formatReservationContact(value: string) {
  const digits = value.replace(/\D/g, '')
  if (value.startsWith('+55') && (digits.length === 12 || digits.length === 13)) {
    return formatBrazilPhoneInput(digits.slice(2))
  }
  return value
}
