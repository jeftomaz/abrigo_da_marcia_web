import { useState } from 'react'
import { Action, FeatureSection, Switch, usePublicSiteSettings } from '@abrigo/shared'
import doacaoPhoto from '../assets/landing_doacao.jpg'

const AMOUNTS = [10, 20, 30, 50, 100, 150]

export function Doacao() {
  const [recurring, setRecurring] = useState(true)
  const [amount, setAmount] = useState<number | null>(null)
  const { data: settings } = usePublicSiteSettings()

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
                onClick={() => setAmount(value)}
                className={`rounded-full py-3 text-base font-medium transition-colors ${
                  selected
                    ? 'bg-marca-clara text-marca dark:bg-marca-escura dark:text-marca-clara'
                    : 'bg-marca-escura text-marca-clara dark:bg-marca-clara dark:text-marca'
                }`}
              >
                R$ {value}
              </button>
            )
          })}
        </div>
      </div>

      {settings?.donationUrl && (
        <div className="mt-8 flex justify-center">
          <Action href={settings.donationUrl} target="_blank" rel="noopener noreferrer" icon="donate">
            Realizar doação
          </Action>
        </div>
      )}
    </FeatureSection>
  )
}
