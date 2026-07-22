import { Action } from '@abrigo/shared'

export function NotFound() {
  return (
    <main className="min-h-screen bg-marca px-10 pt-10 pb-20 text-on-brand lg:px-6 lg:pt-4">
      <div className="mx-auto max-w-2xl text-center">
        <header>
          <h1 className="text-5xl leading-tight font-medium lg:text-8xl">
            Página não encontrada
          </h1>
          <p className="mt-4 text-2xl font-medium lg:mt-2">
            O endereço acessado não existe ou foi movido.
          </p>
        </header>
        <Action
          to="/"
          icon="home-simple-door"
          size="small"
          variant="primary-on-brand"
          className="mx-auto mt-10 px-6"
        >
          Voltar para o início
        </Action>
      </div>
    </main>
  )
}
