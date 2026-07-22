import { Action } from '@abrigo/shared'

export function NotFound() {
  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className="mx-auto max-w-2xl py-10 text-center">
        <h1 className="text-4xl font-medium">Página não encontrada</h1>
        <p className="mt-3">O endereço acessado não existe ou foi movido.</p>
        <Action
          to="/"
          icon="arrow-left-circle-solid"
          size="small"
          variant="primary-adaptive"
          className="mx-auto mt-6 px-6"
        >
          Voltar para Cães
        </Action>
      </div>
    </main>
  )
}
