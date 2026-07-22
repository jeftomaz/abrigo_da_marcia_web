import { useState } from 'react'
import { Action, createDonationPixCode, Dialog, FeatureSection, Switch, usePublicSiteSettings } from '@abrigo/shared'
import doacaoPhoto from '../assets/landing_doacao.jpg'

const AMOUNTS = [10, 20, 30, 50, 100, 150]

export function Doacao() {
  const [recurring, setRecurring] = useState(true)
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [pixCode, setPixCode] = useState('')
  const [copied, setCopied] = useState(false)
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
      setCopied(false)
      setPixCode(createDonationPixCode(settings.donationPixKey, settings.donationPixReceiver, settings.donationPixCity, selectedAmount))
    }
  }

  const copyPix = async () => {
    await navigator.clipboard.writeText(pixCode)
    setCopied(true)
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
        <Dialog ariaLabel="Pix para doação" onClose={() => setPixCode('')} className="w-full max-w-xl rounded-3xl bg-surface-raised p-6 text-left text-on-surface-raised sm:p-10">
          <h3 className="text-3xl font-medium text-marca">Pix para doação</h3>
          <p className="mt-3">Valor: R$ {selectedAmount.toFixed(2).replace('.', ',')}</p>
          <code className="mt-4 block max-h-40 overflow-auto break-all rounded-xl bg-cinza-claro p-4 text-xs text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro">{pixCode}</code>
          <div className="mt-6 flex justify-end">
            <Action onClick={() => void copyPix()}>{copied ? 'Código copiado' : 'Copiar código Pix'}</Action>
          </div>
        </Dialog>
      )}
    </FeatureSection>
  )
}
