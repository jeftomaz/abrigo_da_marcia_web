type ImageSubmitLabelOptions = {
  hasPendingUploads: boolean
  idleLabel: string
  isProcessing: boolean
  isSaving: boolean
}

export function getImageSubmitLabel({
  hasPendingUploads,
  idleLabel,
  isProcessing,
  isSaving,
}: ImageSubmitLabelOptions) {
  if (isProcessing) return 'Processando...'
  if (isSaving) return hasPendingUploads ? 'Enviando...' : 'Salvando...'
  return idleLabel
}
