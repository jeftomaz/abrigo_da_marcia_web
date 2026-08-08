import { useState } from 'react'
import { Action, TextField } from '@abrigo/shared'

type AuthenticatorCodeFormProps = {
  description: string
  embedded?: boolean
  onSubmit: (code: string) => Promise<void>
  submitLabel?: string
  title: string
}

export function AuthenticatorCodeForm({
  description,
  embedded = false,
  onSubmit,
  submitLabel = 'Verificar',
  title,
}: AuthenticatorCodeFormProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('Informe o código de 6 dígitos.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(code)
    } catch {
      setError('Código inválido ou expirado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const Heading = embedded ? 'h2' : 'h1'

  return (
    <form onSubmit={submit}>
      <Heading className="text-3xl font-medium text-marca">{title}</Heading>
      <p className="mt-3">{description}</p>
      <label className="mt-6 block font-medium">
        Código do autenticador
        <TextField
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="mt-1 h-11 px-4 text-center text-2xl tracking-[0.35em]"
        />
      </label>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
      <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
        {isSubmitting ? 'Verificando...' : submitLabel}
      </Action>
    </form>
  )
}
