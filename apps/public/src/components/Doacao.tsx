import { useState } from 'react'
import { Action, createDonationPixCode, FeatureSection, Switch, usePublicSiteSettings } from '@abrigo/shared'
import { PixConfirmationDialog } from './ReservationDialogs'
import doacaoPhoto from '../assets/landing_doacao.jpg'

const AMOUNTS = [10, 20, 30, 50, 100, 150]

export function Doacao() {
  const [recurring, setRecurring] = useState(true)
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [pixCode, setPixCode] = useState('')
  const { data: settings } = usePublicSiteSettings()
  const selectedAmount = amount ?? Number(customAmount.replace(',', '.'))
  const validAmount = Number.isFinite(selectedAmount) && selectedAmount > 0 && selectedAmount <= 99_999_999.99
  const pixConfigured = Boolean(settings?.donationPixKey && settings.donationPixReceiver && settings.donationPixCity)
  const recurringUrl = amount ? settings?.recurringDonationUrls[String(amount)] : undefined

  const donate = () => {
    if (recurring && recurringUrl) {
      window.open(recurringUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (!recurring && settings && pixConfigured && validAmount) {
      setPixCode(createDonationPixCode(settings.donationPixKey, settings.donationPixReceiver, settings.donationPixCity, selectedAmount))
    }
  }

  return (
    <FeatureSection
      id="doacao"
      tone="contrast"
      image={{ src: doacaoPhoto, alt: 'Cão idoso resgatado, sorrindo no abrigo' }}
      imagePosition="start"
      contentClassName="text-right"
      heading={
        <h2 className="text-5xl leading-tight font-medium text-marca lg:text-8xl">
          Ajude a manter o Abrigo
        </h2>
      }
    >
      <div className="space-y-6 text-2xl">
        <p>
          O abrigo é mantido através de trabalho voluntário e doações. Quer
          ajudar também?
        </p>
        <p>
          Faça uma doação para conseguirmos manter nossos cães saudáveis e de
          barriguinha cheia.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-center gap-3 text-base lg:text-lg">
        <span>Doação única</span>
        <Switch
          checked={recurring}
          onChange={setRecurring}
          aria-label="Alternar entre doação única e recorrente"
        />
        <span>Doação recorrente (mensal)</span>
      </div>

      <div className="mx-auto mt-8 max-w-md rounded-3xl bg-marca p-3">
        <div className="grid grid-cols-3 gap-3">
          {AMOUNTS.map((value) => {
            const selected = value === amount
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                disabled={recurring && !settings?.recurringDonationUrls[String(value)]}
                onClick={() => { setAmount(value); setCustomAmount('') }}
                className={`min-h-11 rounded-full py-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara ${
                  selected
                    ? 'bg-marca-clara text-marca dark:bg-marca-escura dark:text-marca-clara'
                    : 'bg-marca-escura text-marca-clara enabled:hover:bg-cinza-escuro disabled:cursor-not-allowed disabled:opacity-40 dark:bg-marca-clara dark:text-marca'
                }`}
              >
                R$ {value}
              </button>
            )
          })}
        </div>
        {!recurring && (
          <label className="mt-3 block rounded-2xl bg-marca-escura px-4 py-3 text-left text-marca-clara dark:bg-marca-clara dark:text-marca">
            Outro valor
            <span className="mt-1 flex items-center gap-2">
              R$
              <input
                inputMode="decimal"
                value={customAmount}
                onChange={(event) => { setCustomAmount(event.target.value.replace(/[^0-9,.]/g, '')); setAmount(null) }}
                className="min-h-11 min-w-0 flex-1 border-b-2 border-current bg-transparent outline-none focus-visible:border-marca-clara dark:focus-visible:border-marca-escura"
                aria-label="Valor livre da doação"
              />
            </span>
          </label>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <Action onClick={donate} disabled={!validAmount || (recurring ? !recurringUrl : !pixConfigured)} icon="donate">
          Realizar doação
        </Action>
      </div>
      {pixCode && (
        <PixConfirmationDialog
          title="Pix para doação"
          pixCode={pixCode}
          pixKey={settings?.donationPixKey ?? ''}
          pixReceiver={settings?.donationPixReceiver ?? ''}
          pixCity={settings?.donationPixCity ?? ''}
          onClose={() => setPixCode('')}
        >
          <p className="mt-4">Valor: R$ {selectedAmount.toFixed(2).replace('.', ',')}</p>
        </PixConfirmationDialog>
      )}
    </FeatureSection>
  )
}
