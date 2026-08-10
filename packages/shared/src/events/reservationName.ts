export function getReservationNameError(value: string) {
  const names = value.trim().split(/\s+/).filter(Boolean)
  if (names.length === 0) return 'Informe seu nome completo.'
  if (names.length < 2) return 'Informe pelo menos dois nomes.'
  return null
}
