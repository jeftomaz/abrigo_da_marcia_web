import { useId, useState } from 'react'
import { Action, TextField } from '@abrigo/shared'
import type { SiteSettings, SocialLinks } from '@abrigo/shared'
import { ConfirmationDialog } from './ConfirmationDialog'

const DONATION_AMOUNTS = [10, 20, 30, 50, 100, 150]

type GlobalSettingsFormProps = {
  layout: 'modal' | 'panel'
  mode: 'dogs' | 'landing'
  onCancel: () => void
  onSave: (settings: SiteSettings, socialLinks: SocialLinks) => Promise<void>
  settings: SiteSettings
  socialLinks: SocialLinks
}

function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function GlobalSettingsForm({
  layout,
  mode,
  onCancel,
  onSave,
  settings,
  socialLinks,
}: GlobalSettingsFormProps) {
  const formId = useId()
  const [adoptionFormUrl, setAdoptionFormUrl] = useState(settings.adoptionFormUrl)
  const [donationPixKey, setDonationPixKey] = useState(settings.donationPixKey)
  const [donationPixReceiver, setDonationPixReceiver] = useState(settings.donationPixReceiver)
  const [donationPixCity, setDonationPixCity] = useState(settings.donationPixCity)
  const [recurringDonationUrls, setRecurringDonationUrls] = useState(settings.recurringDonationUrls)
  const [volunteerFormUrl, setVolunteerFormUrl] = useState(settings.volunteerFormUrl)
  const [facebook, setFacebook] = useState(socialLinks.facebook)
  const [instagram, setInstagram] = useState(socialLinks.instagram)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<{ links: SocialLinks; settings: SiteSettings } | null>(null)
  const isPanel = layout === 'panel'
  const fieldClasses = `${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'} mt-1`
  const labelClasses = `${isPanel ? 'text-sm' : 'text-base'} block font-medium`

  const persist = async (nextSettings: SiteSettings, nextSocialLinks: SocialLinks) => {
    setIsSaving(true)
    setSaveError('')
    try {
      await onSave(nextSettings, nextSocialLinks)
    } catch {
      setSaveError('Não foi possível salvar as configurações.')
    } finally {
      setIsSaving(false)
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const nextSettings: SiteSettings = {
      adoptionFormUrl: adoptionFormUrl.trim(),
      donationPixCity: donationPixCity.trim(),
      donationPixKey: donationPixKey.trim(),
      donationPixReceiver: donationPixReceiver.trim(),
      recurringDonationUrls: Object.fromEntries(
        Object.entries(recurringDonationUrls).filter(([, url]) => url.trim()).map(([value, url]) => [value, url.trim()]),
      ),
      volunteerFormUrl: volunteerFormUrl.trim(),
    }
    const nextSocialLinks = { facebook: facebook.trim(), instagram: instagram.trim() }
    const urls = mode === 'dogs'
      ? [nextSettings.adoptionFormUrl]
      : [nextSettings.volunteerFormUrl, nextSocialLinks.facebook, nextSocialLinks.instagram, ...Object.values(nextSettings.recurringDonationUrls)].filter(Boolean)

    if (!urls.every(isHttpsUrl)) {
      setSaveError('Informe links HTTPS completos e válidos.')
      return
    }
    const pixFields = [nextSettings.donationPixKey, nextSettings.donationPixReceiver, nextSettings.donationPixCity]
    if (mode === 'landing' && pixFields.some(Boolean) && !pixFields.every(Boolean)) {
      setSaveError('Preencha chave, recebedor e cidade para habilitar a doação única via Pix.')
      return
    }
    if (mode === 'landing') {
      const removed = [
        Object.keys(settings.recurringDonationUrls).some((value) => !nextSettings.recurringDonationUrls[value]),
        settings.volunteerFormUrl && !nextSettings.volunteerFormUrl,
        socialLinks.facebook && !nextSocialLinks.facebook,
        socialLinks.instagram && !nextSocialLinks.instagram,
      ].some(Boolean)
      if (removed) { setPendingRemoval({ settings: nextSettings, links: nextSocialLinks }); return }
    }
    void persist(nextSettings, nextSocialLinks)
  }

  return (
    <form onSubmit={submit}>
      <div className={isPanel ? 'grid grid-cols-[13rem_minmax(0,1fr)] gap-8' : ''}>
        <div>
          <h2 className={`${isPanel ? 'text-3xl' : 'text-4xl'} font-medium text-marca`}>Editar Valores Padrão</h2>
          <p className={`${isPanel ? 'mt-3 text-xl' : 'mt-2 text-2xl'} font-medium`}>
            {mode === 'landing' ? 'Landing Page' : 'Gestão de Cães'}
          </p>
        </div>
        <div className={isPanel ? '' : 'mt-8'}>
          {mode === 'dogs' ? (
            <label htmlFor={`${formId}-adoption`} className={labelClasses}>
              Formulário global de adoção
              <TextField
                id={`${formId}-adoption`}
                type="url"
                required
                value={adoptionFormUrl}
                onChange={(event) => setAdoptionFormUrl(event.target.value)}
                placeholder="https://forms.gle/..."
                className={fieldClasses}
              />
              <span className="mt-2 block text-xs font-normal">Usado por todos os CTAs de adoção e novos cadastros.</span>
            </label>
          ) : (
            <>
              <section>
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Doação única via Pix</h3>
                <label htmlFor={`${formId}-pix-key`} className={`${labelClasses} mt-3`}>
                  Chave Pix
                  <TextField id={`${formId}-pix-key`} maxLength={77} value={donationPixKey} onChange={(event) => setDonationPixKey(event.target.value)} className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-pix-receiver`} className={`${labelClasses} mt-3`}>
                  Nome do recebedor
                  <TextField id={`${formId}-pix-receiver`} maxLength={25} value={donationPixReceiver} onChange={(event) => setDonationPixReceiver(event.target.value)} className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-pix-city`} className={`${labelClasses} mt-3`}>
                  Cidade
                  <TextField id={`${formId}-pix-city`} maxLength={15} value={donationPixCity} onChange={(event) => setDonationPixCity(event.target.value)} className={fieldClasses} />
                </label>
              </section>
              <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Doação recorrente via PagSeguro</h3>
                {DONATION_AMOUNTS.map((value) => (
                  <label key={value} htmlFor={`${formId}-recurring-${value}`} className={`${labelClasses} mt-3`}>
                    Link mensal de R$ {value}
                    <TextField
                      id={`${formId}-recurring-${value}`}
                      type="url"
                      value={recurringDonationUrls[String(value)] ?? ''}
                      onChange={(event) => setRecurringDonationUrls((current) => ({ ...current, [value]: event.target.value }))}
                      placeholder="https://pagseguro.uol.com.br/..."
                      className={fieldClasses}
                    />
                  </label>
                ))}
              </section>
              <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Outros links da página</h3>
                <label htmlFor={`${formId}-volunteer`} className={`${labelClasses} mt-3`}>
                  Formulário de voluntariado
                  <TextField id={`${formId}-volunteer`} type="url" value={volunteerFormUrl} onChange={(event) => setVolunteerFormUrl(event.target.value)} placeholder="https://forms.gle/..." className={fieldClasses} />
                </label>
                <p className="mt-2 text-xs">Valores recorrentes sem link e CTAs sem destino ficam indisponíveis no site.</p>
              </section>
              <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Redes sociais</h3>
                <label htmlFor={`${formId}-facebook`} className={`${labelClasses} mt-3`}>
                  Facebook
                  <TextField id={`${formId}-facebook`} type="url" value={facebook} onChange={(event) => setFacebook(event.target.value)} placeholder="https://facebook.com/..." className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-instagram`} className={`${labelClasses} mt-3`}>
                  Instagram
                  <TextField id={`${formId}-instagram`} type="url" value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="https://instagram.com/..." className={fieldClasses} />
                </label>
              </section>
            </>
          )}
        </div>
      </div>
      {saveError && <p role="alert" className="mt-4 text-sm font-medium text-marca">{saveError}</p>}
      <div className={`${isPanel ? 'mt-6' : 'mt-8'} flex gap-4`}>
        <Action onClick={onCancel} size="small" variant="secondary-adaptive" className="w-28 shrink-0">Cancelar</Action>
        <Action type="submit" size="small" variant="primary-adaptive" disabled={isSaving} className="min-w-0 flex-1">
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Action>
      </div>
      {pendingRemoval && <ConfirmationDialog title="Ocultar links públicos" description="Botões e redes sem link deixarão de aparecer no site público." isPending={isSaving} onCancel={() => setPendingRemoval(null)} onConfirm={() => { const pending = pendingRemoval; setPendingRemoval(null); void persist(pending.settings, pending.links) }} />}
    </form>
  )
}
