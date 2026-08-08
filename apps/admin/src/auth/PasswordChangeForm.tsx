import { useState } from 'react'
import { Action, TextField } from '@abrigo/shared'

type PasswordChangeFormProps = {
  description: string
  embedded?: boolean
  onCancel?: () => void
  onSubmit: (password: string) => Promise<void>
  submitLabel?: string
  title: string
}

// oxlint-disable-next-line react/only-export-components -- política compartilhada com o onboarding.
export const isStrongPassword = (password: string) => password.length >= 12
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /\d/.test(password)
  && /[^A-Za-z0-9]/.test(password)

export function PasswordChangeForm({
  description,
  embedded = false,
  onCancel,
  onSubmit,
  submitLabel = 'Alterar senha',
  title,
}: PasswordChangeFormProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isStrongPassword(password)) {
      setError('Use pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(password)
    } catch {
      setError('Não foi possível alterar a senha. Tente novamente.')
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
        Nova senha
        <TextField
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 h-11 px-4"
          aria-describedby="new-password-requirements"
        />
      </label>
      <p id="new-password-requirements" className="mt-2 text-sm">
        Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
      </p>
      <label className="mt-4 block font-medium">
        Confirmar nova senha
        <TextField
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-1 h-11 px-4"
        />
      </label>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
      <div className="mt-6 flex gap-3">
        {onCancel && (
          <Action onClick={onCancel} size="small" variant="secondary-adaptive" className="min-w-0 flex-1">
            Cancelar
          </Action>
        )}
        <Action type="submit" disabled={isSubmitting} size={onCancel ? 'small' : 'default'} className="min-w-0 flex-1">
          {isSubmitting ? 'Salvando...' : submitLabel}
        </Action>
      </div>
    </form>
  )
}
