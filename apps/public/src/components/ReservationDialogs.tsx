import { useId, useState, type ReactNode } from 'react'
import { Action, Dialog } from '@abrigo/shared'
import { DEMO_PIX_CODE } from './reservation'

type ReservationCheckoutDialogProps = {
  children: ReactNode
  onBack: () => void
  onConfirm: () => void
  title: string
}

type ReservationConfirmationDialogProps = {
  children: ReactNode
  onClose: () => void
}

function DemoPixQrCode() {
  const size = 29
  const finderOrigins = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
  const isFinderArea = (x: number, y: number) =>
    finderOrigins.some(
      ([originX, originY]) =>
        x >= originX && x <= originX + 6 && y >= originY && y <= originY + 6,
    )
  const isFinderCell = (x: number, y: number) =>
    finderOrigins.some(([originX, originY]) => {
      const localX = x - originX
      const localY = y - originY
      if (localX < 0 || localX > 6 || localY < 0 || localY > 6) return false
      return (
        localX === 0 ||
        localX === 6 ||
        localY === 0 ||
        localY === 6 ||
        (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
      )
    })

  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="Ilustração de QR Code Pix demonstrativo"
      className="aspect-square w-full bg-white text-cinza-escuro"
    >
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="white" />
      {Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => {
          const finder = isFinderCell(x, y)
          const timing = (x === 7 || y === 7) && (x + y) % 2 === 0
          const data = ((x * 149 + y * 97) ^ ((x + y) * 53) ^ (x * y * 7)) % 17 < 8
          if ((!finder && isFinderArea(x, y)) || (!finder && !timing && !data)) return null
          return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
        }),
      )}
    </svg>
  )
}

export function ReservationCheckoutDialog({
  children,
  onBack,
  onConfirm,
  title,
}: ReservationCheckoutDialogProps) {
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const titleId = useId()
  const canSubmit = Boolean(customerName.trim() && contact.trim())

  return (
    <Dialog
      ariaLabelledBy={titleId}
      onClose={onBack}
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-7 text-on-surface-raised sm:p-10"
    >
      <h2 id={titleId} className="text-3xl font-medium text-marca sm:text-4xl">
        {title}
      </h2>
      {children}
      <form
        className="mt-8"
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onConfirm()
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
        <label htmlFor={`${titleId}-customer-contact`} className="mt-5 block">
          Telefone ou e-mail
        </label>
        <input
          id={`${titleId}-customer-contact`}
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="(00) 98765-4321"
          autoComplete="email"
          required
          className="mt-1 h-10 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
        />
        <p className="mt-3 text-xs">
          Esses dados serão utilizados apenas para registrar a reserva e entrar em contato, sendo
          removidos após o evento.
        </p>
        <div className="mt-6 flex gap-4">
          <Action onClick={onBack} size="small" variant="secondary" className="w-24 shrink-0">
            Voltar
          </Action>
          <Action type="submit" disabled={!canSubmit} size="small" className="min-w-0 flex-1">
            Finalizar sua reserva
          </Action>
        </div>
      </form>
    </Dialog>
  )
}

export function ReservationConfirmationDialog({
  children,
  onClose,
}: ReservationConfirmationDialogProps) {
  const [pixCopied, setPixCopied] = useState(false)
  const titleId = useId()

  const copyPixCode = async () => {
    await navigator.clipboard.writeText(DEMO_PIX_CODE)
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
      <p className="mt-5 text-sm">
        Envie o comprovante para o Instagram @abrigodamarcia ou via WhatsApp para um voluntário.
      </p>
      <div className="mx-auto mt-6 w-4/5 max-w-72">
        <DemoPixQrCode />
        <Action onClick={copyPixCode} className="mt-3 flex w-full" size="small">
          {pixCopied ? 'Código copiado' : 'Copiar código PIX'}
        </Action>
      </div>
      <p className="mt-4 text-center text-xs text-marca">
        Código Pix demonstrativo até a integração da chave oficial.
      </p>
      <p className="mt-6 text-xs">
        A confirmação da reserva é feita manualmente pelos comprovantes recebidos.
      </p>
      <Action onClick={onClose} className="mt-8 flex w-full" size="small">
        Fechar
      </Action>
    </Dialog>
  )
}
