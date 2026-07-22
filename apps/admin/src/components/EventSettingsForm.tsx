import { useEffect, useState } from 'react'
import { Action, useEventSettings, useSaveEventSettings } from '@abrigo/shared'
import type { EventSettings } from '../events/events'

const EMPTY_SETTINGS: EventSettings = {
  defaultMaxProductUnits: 10,
  defaultMaxRaffleNumbers: 10,
  defaultReservationTtlMinutes: 30,
  eventExportEmail: '',
}

export function EventSettingsForm() {
  const { data } = useEventSettings()
  const saveSettings = useSaveEventSettings()
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (data) setSettings(data)
  }, [data])

  const setField = <Key extends keyof EventSettings>(key: Key, value: EventSettings[Key]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  return (
    <details className="rounded-2xl bg-surface-raised p-4 text-on-surface-raised">
      <summary className="cursor-pointer text-lg font-medium">Regras padrão de reserva</summary>
      <form
        className="mt-4 grid grid-cols-2 gap-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setMessage('')
          try {
            await saveSettings.mutateAsync(settings)
            setMessage('Configurações salvas.')
          } catch {
            setMessage('Não foi possível salvar as configurações.')
          }
        }}
      >
        <label className="text-sm font-medium">Máx. números<input type="number" min="1" required value={settings.defaultMaxRaffleNumbers} onChange={(event) => setField('defaultMaxRaffleNumbers', Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border-2 border-cinza-medio bg-transparent px-3" /></label>
        <label className="text-sm font-medium">Máx. produtos<input type="number" min="1" required value={settings.defaultMaxProductUnits} onChange={(event) => setField('defaultMaxProductUnits', Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border-2 border-cinza-medio bg-transparent px-3" /></label>
        <label className="text-sm font-medium">Expiração (min)<input type="number" min="1" required value={settings.defaultReservationTtlMinutes} onChange={(event) => setField('defaultReservationTtlMinutes', Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border-2 border-cinza-medio bg-transparent px-3" /></label>
        <label className="text-sm font-medium">E-mail das cópias<input type="email" value={settings.eventExportEmail} onChange={(event) => setField('eventExportEmail', event.target.value)} className="mt-1 h-10 w-full rounded-lg border-2 border-cinza-medio bg-transparent px-3" /></label>
        {message && <p role="status" className="col-span-2 text-sm">{message}</p>}
        <Action type="submit" disabled={saveSettings.isPending} size="small" variant="primary-adaptive" className="col-span-2">{saveSettings.isPending ? 'Salvando...' : 'Salvar regras'}</Action>
      </form>
    </details>
  )
}
