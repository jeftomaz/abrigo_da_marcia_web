import { limparResiduosE2E } from './banco'

// A reserva é o único fluxo público que escreve. Sem a limpeza, cada execução
// consumiria números da rifa até esgotar o seed.
export default function globalTeardown() {
  limparResiduosE2E()
}
