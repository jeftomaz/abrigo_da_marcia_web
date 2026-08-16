import { useId, useState, type ReactNode } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Action,
  Dialog,
  formatBrazilPhoneInput,
  getReservationContactError,
  getReservationNameError,
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

type PixConfirmationDialogProps = {
  children: ReactNode
  expiresAt?: string
  onClose: () => void
  pixCode: string
  postPaymentInstructions?: string
  title: string
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
  const [contactType, setContactType] = useState<ReservationContactType>('mobile')
  const [nameTouched, setNameTouched] = useState(false)
  const [contactTouched, setContactTouched] = useState(false)
  const titleId = useId()
  const nameError = getReservationNameError(customerName)
  const contactError = getReservationContactError(contactType, contact)
  const canSubmit = Boolean(!nameError && contact.trim())

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
          setNameTouched(true)
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
          onBlur={() => setNameTouched(true)}
          placeholder="Ex.: João Maria da Silva"
          autoComplete="name"
          aria-invalid={nameTouched && Boolean(nameError)}
          aria-describedby={nameTouched && nameError ? `${titleId}-customer-name-error` : undefined}
          required
          className="mt-1 h-11 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
        />
        {nameTouched && nameError && (
          <p id={`${titleId}-customer-name-error`} role="alert" className="mt-2 text-sm font-medium text-marca">
            {nameError}
          </p>
        )}
        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="font-medium">Contato</span>
          <button
            type="button"
            onClick={() => {
              setContactType(contactType === 'email' ? 'mobile' : 'email')
              setContact('')
              setContactTouched(false)
            }}
            className="rounded text-sm font-medium text-marca-escura underline underline-offset-4 hover:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca dark:text-marca-clara"
          >
            {contactType === 'email' ? 'Colocar celular' : 'Não tenho celular'}
          </button>
        </div>
        <label htmlFor={`${titleId}-customer-contact`} className="mt-2 block">
          {contactType === 'email' ? 'E-mail' : 'Celular com DDD'}
        </label>
        <input
          id={`${titleId}-customer-contact`}
          type={contactType === 'email' ? 'email' : 'tel'}
          inputMode={contactType === 'email' ? 'email' : 'tel'}
          value={contact}
          onChange={(event) => setContact(contactType === 'email' ? event.target.value : formatBrazilPhoneInput(event.target.value))}
          onBlur={() => setContactTouched(true)}
          placeholder={contactType === 'email' ? 'nome@dominio.com' : '(11) 98765-4321'}
          autoComplete={contactType === 'email' ? 'email' : 'tel'}
          aria-invalid={contactTouched && Boolean(contactError)}
          aria-describedby={contactTouched && contactError ? `${titleId}-customer-contact-error` : undefined}
          required
          className="mt-1 h-11 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
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

export function PixConfirmationDialog({
  children,
  expiresAt,
  onClose,
  pixCode,
  postPaymentInstructions,
  title,
}: PixConfirmationDialogProps) {
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
      className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-5 text-left text-on-surface-raised sm:p-8"
    >
      <h2 id={titleId} className="text-3xl font-medium text-marca sm:text-4xl">
        {title}
      </h2>
      {children}
      {postPaymentInstructions && <p className="mt-3 text-sm">{postPaymentInstructions}</p>}
      <div className="mt-4 flex flex-col items-center">
        <div className="bg-white p-2">
          {/* Sem title/role o SVG não tem nome acessível e o leitor de tela não anuncia
              o QR — quem não enxerga precisa saber que o botão de copiar é a alternativa. */}
          <QRCodeSVG
            value={pixCode}
            title="QR Code do Pix. Use o botão abaixo para copiar o código."
            role="img"
            className="size-48"
            marginSize={0}
          />
        </div>
        <Action onClick={copyPixCode} className="mt-2 w-full max-w-56 py-2" size="small">
          {pixCopied ? 'Código copiado' : 'Copiar código PIX'}
        </Action>
      </div>
      {expiresAt && (
        <p className="mt-3 text-xs">
          Pague até {new Date(expiresAt).toLocaleString('pt-BR')}. Depois desse horário, a
          reserva pendente expira e os itens voltam a ficar disponíveis.
        </p>
      )}
      <div className="mt-3 flex justify-center">
        <Action onClick={onClose} size="compact" variant="secondary-adaptive">
          Fechar
        </Action>
      </div>
    </Dialog>
  )
}
