import { useId, useState } from 'react'
import { Action, Switch } from '@abrigo/shared'
import type { EventSettings } from '@abrigo/shared'

type EventSettingsFormProps = {
  layout: 'modal' | 'panel'
  onCancel: () => void
  onSave: (settings: EventSettings) => Promise<void>
  settings: EventSettings
}

type ExpirationUnit = 'hours' | 'minutes'

function formatHours(minutes: number) {
  return String(Number((minutes / 60).toFixed(4)))
}

export function EventSettingsForm({
  layout,
  onCancel,
  onSave,
  settings,
}: EventSettingsFormProps) {
  const formId = useId()
  const [maxProductUnits, setMaxProductUnits] = useState(
    String(settings.defaultMaxProductUnits),
  )
  const [maxRaffleNumbers, setMaxRaffleNumbers] = useState(
    String(settings.defaultMaxRaffleNumbers),
  )
  const [expirationUnit, setExpirationUnit] = useState<ExpirationUnit>('minutes')
  const [expirationValue, setExpirationValue] = useState(
    String(settings.defaultReservationTtlMinutes),
  )
  const [eventExportEmail, setEventExportEmail] = useState(settings.eventExportEmail)
  const [pixKey, setPixKey] = useState(settings.defaultPixKey)
  const [pixReceiver, setPixReceiver] = useState(settings.defaultPixReceiver)
  const [pixCity, setPixCity] = useState(settings.defaultPixCity)
  const [pixCopyPaste, setPixCopyPaste] = useState(settings.defaultPixCopyPaste)
  const [postPaymentInstructions, setPostPaymentInstructions] = useState(
    settings.defaultPostPaymentInstructions,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `${
    isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'
  } mt-1 w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const labelClasses = `${isPanel ? 'text-sm' : 'text-base'} block font-medium`

  const changeExpirationUnit = (nextUnit: ExpirationUnit) => {
    if (nextUnit === expirationUnit) return
    const currentValue = Number(expirationValue)
    if (Number.isFinite(currentValue) && currentValue > 0) {
      setExpirationValue(
        nextUnit === 'hours'
          ? formatHours(currentValue)
          : String(Number((currentValue * 60).toFixed(4))),
      )
    }
    setExpirationUnit(nextUnit)
    setSaveError('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const productLimit = Number(maxProductUnits)
    const raffleLimit = Number(maxRaffleNumbers)
    const rawExpiration = Number(expirationValue)
    const rawExpirationMinutes =
      expirationUnit === 'minutes' ? rawExpiration : rawExpiration * 60
    const expirationMinutes = Math.round(rawExpirationMinutes)

    if (
      !Number.isInteger(productLimit) ||
      productLimit < 1 ||
      !Number.isInteger(raffleLimit) ||
      raffleLimit < 1
    ) {
      setSaveError('Os limites devem ser números inteiros maiores que zero.')
      return
    }
    if (
      !Number.isFinite(rawExpirationMinutes) ||
      expirationMinutes < 1 ||
      Math.abs(rawExpirationMinutes - expirationMinutes) > 0.000001
    ) {
      setSaveError('O tempo de expiração deve corresponder a minutos inteiros.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        defaultMaxProductUnits: productLimit,
        defaultMaxRaffleNumbers: raffleLimit,
        defaultPixCity: pixCity.trim(),
        defaultPixCopyPaste: pixCopyPaste.trim(),
        defaultPixKey: pixKey.trim(),
        defaultPixReceiver: pixReceiver.trim(),
        defaultPostPaymentInstructions: postPaymentInstructions.trim(),
        defaultReservationTtlMinutes: expirationMinutes,
        eventExportEmail: eventExportEmail.trim(),
      })
    } catch {
      setSaveError('Não foi possível salvar as configurações de Eventos.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={isPanel ? 'grid grid-cols-[13rem_minmax(0,1fr)] gap-8' : ''}>
        <div>
          <h2 className={`${isPanel ? 'text-3xl' : 'text-4xl'} font-medium text-marca`}>
            Editar Valores Padrão
          </h2>
          <p className={`${isPanel ? 'mt-3 text-xl' : 'mt-2 text-2xl'} font-medium`}>
            Gestão de Eventos
          </p>
        </div>

        <div className={isPanel ? '' : 'mt-8'}>
          <section>
            <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>
              Limites por reserva
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label htmlFor={`${formId}-products`} className={labelClasses}>
                Produtos
                <input
                  id={`${formId}-products`}
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={maxProductUnits}
                  onChange={(event) => {
                    setMaxProductUnits(event.target.value)
                    setSaveError('')
                  }}
                  className={fieldClasses}
                />
              </label>
              <label htmlFor={`${formId}-raffle`} className={labelClasses}>
                Números de rifa
                <input
                  id={`${formId}-raffle`}
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={maxRaffleNumbers}
                  onChange={(event) => {
                    setMaxRaffleNumbers(event.target.value)
                    setSaveError('')
                  }}
                  className={fieldClasses}
                />
              </label>
            </div>
          </section>

          <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
            <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>
              Tempo de expiração de reserva
            </h3>
            <div className="mt-3 flex items-center gap-3 text-sm font-medium">
              <button
                type="button"
                onClick={() => changeExpirationUnit('hours')}
                aria-pressed={expirationUnit === 'hours'}
              >
                Horas
              </button>
              <Switch
                checked={expirationUnit === 'minutes'}
                onChange={(checked) => changeExpirationUnit(checked ? 'minutes' : 'hours')}
                aria-label="Alternar entre horas e minutos"
              />
              <button
                type="button"
                onClick={() => changeExpirationUnit('minutes')}
                aria-pressed={expirationUnit === 'minutes'}
              >
                Minutos
              </button>
            </div>
            <label htmlFor={`${formId}-expiration`} className={`${labelClasses} mt-3`}>
              Tempo padrão
              <input
                id={`${formId}-expiration`}
                type="number"
                min={expirationUnit === 'minutes' ? 1 : 1 / 60}
                step={expirationUnit === 'minutes' ? 1 : 1 / 60}
                required
                value={expirationValue}
                onChange={(event) => {
                  setExpirationValue(event.target.value)
                  setSaveError('')
                }}
                className={`${fieldClasses} max-w-28`}
              />
            </label>
          </section>

          <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
            <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>
              Pagamento padrão de novos eventos
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <label htmlFor={`${formId}-pix-key`} className={labelClasses}>
                Chave Pix
                <input
                  id={`${formId}-pix-key`}
                  value={pixKey}
                  onChange={(event) => setPixKey(event.target.value)}
                  className={fieldClasses}
                />
              </label>
              <label htmlFor={`${formId}-pix-city`} className={labelClasses}>
                Cidade
                <input
                  id={`${formId}-pix-city`}
                  value={pixCity}
                  onChange={(event) => setPixCity(event.target.value)}
                  className={fieldClasses}
                />
              </label>
              <label htmlFor={`${formId}-pix-receiver`} className={`${labelClasses} col-span-2`}>
                Recebedor
                <input
                  id={`${formId}-pix-receiver`}
                  value={pixReceiver}
                  onChange={(event) => setPixReceiver(event.target.value)}
                  className={fieldClasses}
                />
              </label>
              <label htmlFor={`${formId}-pix-code`} className={`${labelClasses} col-span-2`}>
                Pix copia-e-cola
                <input
                  id={`${formId}-pix-code`}
                  value={pixCopyPaste}
                  onChange={(event) => setPixCopyPaste(event.target.value)}
                  className={fieldClasses}
                />
              </label>
              <label htmlFor={`${formId}-payment-instructions`} className={`${labelClasses} col-span-2`}>
                Instrução pós-pagamento
                <textarea
                  id={`${formId}-payment-instructions`}
                  value={postPaymentInstructions}
                  onChange={(event) => setPostPaymentInstructions(event.target.value)}
                  rows={2}
                  className={`${fieldClasses} h-auto py-2`}
                />
              </label>
            </div>
          </section>

          <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
            <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>
              Auditoria
            </h3>
            <label htmlFor={`${formId}-email`} className={`${labelClasses} mt-3`}>
              E-mail para cópia das exportações
              <input
                id={`${formId}-email`}
                type="email"
                value={eventExportEmail}
                onChange={(event) => {
                  setEventExportEmail(event.target.value)
                  setSaveError('')
                }}
                placeholder="contato@abrigo.org"
                className={fieldClasses}
              />
            </label>
          </section>
        </div>
      </div>

      {saveError && (
        <p role="alert" className="mt-4 text-sm font-medium text-marca">
          {saveError}
        </p>
      )}

      <div className={`${isPanel ? 'mt-6' : 'mt-8'} flex gap-4`}>
        <Action
          onClick={onCancel}
          size="small"
          variant="secondary-adaptive"
          className="w-28 shrink-0"
        >
          Cancelar
        </Action>
        <Action
          type="submit"
          size="small"
          variant="primary-adaptive"
          disabled={isSaving}
          className="min-w-0 flex-1"
        >
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Action>
      </div>
    </form>
  )
}
