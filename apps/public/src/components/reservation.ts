export const DEMO_PIX_CODE = 'PIX-DEMONSTRACAO-ABRIGO-DA-MARCIA'

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
