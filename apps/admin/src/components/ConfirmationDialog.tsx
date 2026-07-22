import { Action, Dialog } from '@abrigo/shared'

type ConfirmationDialogProps = {
  confirmLabel?: string
  description: string
  isPending?: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function ConfirmationDialog({ confirmLabel = 'Confirmar', description, isPending, onCancel, onConfirm, title }: ConfirmationDialogProps) {
  return (
    <Dialog ariaLabel={title} onClose={onCancel} className="w-full max-w-[34rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised">
      <h2 className="text-3xl font-medium text-marca">{title}</h2>
      <p className="mt-4">{description}</p>
      <div className="mt-8 flex gap-4">
        <Action onClick={onCancel} disabled={isPending} size="small" variant="secondary-adaptive" className="w-28">Cancelar</Action>
        <Action onClick={onConfirm} disabled={isPending} size="small" variant="primary-adaptive" className="flex-1">{isPending ? 'Processando...' : confirmLabel}</Action>
      </div>
    </Dialog>
  )
}
