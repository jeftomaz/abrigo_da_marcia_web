import { useId, useState, type ReactNode } from 'react'
import {
  Action,
  Dialog,
  Switch,
  formatBrazilPhoneInput,
  getReservationContactError,
  normalizeReservationContact,
} from '@abrigo/shared'
import type { ReservationContactType } from '@abrigo/shared'

type ReservationCheckoutDialogProps = {
  active?: boolean
  children: ReactNode
  error?: string
  isSubmitting?: boolean
  onBack: () => void
  onConfirm: (customer: { contact: string; name: string }) => Promise<void> | void
  title: string
}

type ReservationConfirmationDialogProps = {
  children: ReactNode
  expiresAt: string
  onClose: () => void
  pixCode: string
  pixCity: string
  pixKey: string
  pixReceiver: string
  postPaymentInstructions: string
}

export function ReservationCheckoutDialog({
  active,
  children,
  error,
  isSubmitting,
  onBack,
  onConfirm,
  title,
}: ReservationCheckoutDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<ReservationContactType>('phone')
  const [contactTouched, setContactTouched] = useState(false)
  const titleId = useId()
  const canSubmit = Boolean(customerName.trim() && contact.trim())
  const contactError = getReservationContactError(contactType, contact)

  return (
    <Dialog
      active={active}
      ariaLabelledBy={titleId}
      onClose={onBack}
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-7 text-on-surface-raised sm:p-10"
    >
      <h2 id={titleId} className="text-3xl font-medium text-marca sm:text-4xl">
        {title}
      </h2>
      {children}
      <form
        noValidate
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault()
          setContactTouched(true)
          if (canSubmit && !contactError && !isSubmitting) void onConfirm({
            contact: normalizeReservationContact(contactType, contact),
            name: customerName.trim(),
          })
        }}
      >
        <h3 className="text-2xl font-medium sm:text-3xl">Seus dados</h3>
        <label htmlFor={`${titleId}-customer-name`} className="mt-2 block">
          Nome completo
        </label>
        <input
          id={`${titleId}-customer-name`}
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Ex.: João Maria da Silva"
          autoComplete="name"
          required
          className="mt-1 h-10 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
        />
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="font-medium">Contato</span>
          <div className="flex items-center gap-2 text-sm">
            <span>Telefone</span>
            <Switch
              checked={contactType === 'email'}
              onChange={(useEmail) => {
                setContactType(useEmail ? 'email' : 'phone')
                setContact('')
                setContactTouched(false)
              }}
              aria-label="Usar e-mail em vez de telefone"
              className="origin-center scale-75"
            />
            <span>E-mail</span>
          </div>
        </div>
        <label htmlFor={`${titleId}-customer-contact`} className="mt-2 block">
          {contactType === 'phone' ? 'Telefone com DDD' : 'E-mail'}
        </label>
        <input
          id={`${titleId}-customer-contact`}
          type={contactType === 'phone' ? 'tel' : 'email'}
          inputMode={contactType === 'phone' ? 'tel' : 'email'}
          value={contact}
          onChange={(event) => setContact(contactType === 'phone' ? formatBrazilPhoneInput(event.target.value) : event.target.value)}
          onBlur={() => setContactTouched(true)}
          placeholder={contactType === 'phone' ? '(11) 98765-4321' : 'nome@dominio.com'}
          autoComplete={contactType === 'phone' ? 'tel' : 'email'}
          aria-invalid={contactTouched && Boolean(contactError)}
          aria-describedby={contactTouched && contactError ? `${titleId}-customer-contact-error` : undefined}
          required
          className="mt-1 h-10 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
        />
        {contactTouched && contactError && (
          <p id={`${titleId}-customer-contact-error`} role="alert" className="mt-2 text-sm font-medium text-marca">
            {contactError}
          </p>
        )}
        <p className="mt-3 text-xs">
          Esses dados serão utilizados apenas para registrar a reserva e entrar em contato, sendo
          removidos após o evento.
        </p>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-marca">{error}</p>}
        <div className="mt-6 flex gap-4">
          <Action
            onClick={onBack}
            size="small"
            variant="secondary-adaptive"
            className="w-24 shrink-0"
          >
            Voltar
          </Action>
          <Action
            type="submit"
            disabled={!canSubmit || isSubmitting}
            size="small"
            variant="primary-adaptive"
            className="min-w-0 flex-1"
          >
            {isSubmitting ? 'Reservando...' : 'Finalizar sua reserva'}
          </Action>
        </div>
      </form>
    </Dialog>
  )
}

export function ReservationConfirmationDialog({
  children,
  expiresAt,
  onClose,
  pixCode,
  pixCity,
  pixKey,
  pixReceiver,
  postPaymentInstructions,
}: ReservationConfirmationDialogProps) {
  const [pixCopied, setPixCopied] = useState(false)
  const titleId = useId()

  const copyPixCode = async () => {
    await navigator.clipboard.writeText(pixCode)
    setPixCopied(true)
  }

  return (
    <Dialog
      ariaLabelledBy={titleId}
      onClose={onClose}
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-7 text-on-surface-raised sm:p-10"
    >
      <h2 id={titleId} className="text-3xl font-medium text-marca sm:text-4xl">
        Reserva confirmada!
      </h2>
      {children}
      <p className="mt-5 text-sm">{postPaymentInstructions}</p>
      <div className="mt-6 rounded-2xl bg-cinza-claro p-4 text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
        <p className="text-sm font-medium">Pix copia e cola</p>
        {(pixReceiver || pixKey || pixCity) && <p className="mt-2 text-xs">Recebedor: {pixReceiver || 'não informado'}{pixCity ? ` • ${pixCity}` : ''}<br />Chave: {pixKey || 'não informada'}</p>}
        <code className="mt-2 block max-h-28 overflow-auto break-all text-xs">{pixCode}</code>
        <Action onClick={copyPixCode} className="mt-4 flex w-full" size="small">
          {pixCopied ? 'Código copiado' : 'Copiar código PIX'}
        </Action>
      </div>
      <p className="mt-6 text-xs">
        Pague até {new Date(expiresAt).toLocaleString('pt-BR')}. Depois desse horário, a
        reserva pendente expira e os itens voltam a ficar disponíveis.
      </p>
      <Action onClick={onClose} className="mt-8 flex w-full" size="small">
        Fechar
      </Action>
    </Dialog>
  )
}
