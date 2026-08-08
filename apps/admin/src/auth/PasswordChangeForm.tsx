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

const PASSWORD_REQUIREMENTS = [
  { label: '12 caracteres ou mais', test: (password: string) => password.length >= 12 },
  { label: 'Uma letra maiúscula', test: (password: string) => /[A-Z]/.test(password) },
  { label: 'Uma letra minúscula', test: (password: string) => /[a-z]/.test(password) },
  { label: 'Um número', test: (password: string) => /\d/.test(password) },
  { label: 'Um caractere especial', test: (password: string) => /[^A-Za-z0-9]/.test(password) },
]

// oxlint-disable-next-line react/only-export-components -- política compartilhada com o onboarding.
export const isStrongPassword = (password: string) => PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password))

export function PasswordRequirements({ id, password }: { id: string; password: string }) {
  const valid = isStrongPassword(password)

  return (
    <div id={id} className="mt-3 text-sm">
      <p role="status" aria-live="polite" className={`font-medium ${valid ? 'text-status-verde-on-surface' : 'text-on-surface-raised'}`}>
        {valid ? 'Senha válida.' : 'A senha ainda não é válida.'}
      </p>
      <ul aria-label="Requisitos da senha" className="mt-2 grid gap-1 sm:grid-cols-2">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const satisfied = requirement.test(password)
          return (
            <li key={requirement.label} className={satisfied ? 'text-status-verde-on-surface' : 'text-cinza-medio dark:text-cinza-claro'}>
              <span aria-hidden="true" className="mr-1">{satisfied ? '✓' : '○'}</span>
              {requirement.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

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
      <PasswordRequirements id="new-password-requirements" password={password} />
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
          aria-describedby={confirmation ? 'new-password-confirmation-status' : undefined}
        />
      </label>
      {confirmation && (
        <p id="new-password-confirmation-status" role="status" aria-live="polite" className={`mt-2 text-sm font-medium ${password === confirmation ? 'text-status-verde-on-surface' : 'text-marca'}`}>
          {password === confirmation ? 'As senhas coincidem.' : 'As senhas não coincidem.'}
        </p>
      )}
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
