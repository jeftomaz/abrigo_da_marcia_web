import { useId, useState } from 'react'
import { Action, TextField, createPixCode } from '@abrigo/shared'
import type { SiteSettings, SocialLinks } from '@abrigo/shared'
import { ConfirmationDialog } from './ConfirmationDialog'

const DONATION_AMOUNTS = [10, 20, 30, 50, 100, 150]

type SettingsMode = 'dogs' | 'general' | 'landing'

type GlobalSettingsFormProps = {
  layout: 'modal' | 'panel'
  mode: SettingsMode
  onCancel: () => void
  onSave: (settings: SiteSettings, socialLinks: SocialLinks) => Promise<void>
  settings: SiteSettings
  socialLinks: SocialLinks
}

const MODE_TITLE: Record<SettingsMode, string> = {
  dogs: 'Gestão de Cães',
  general: 'Configurações gerais',
  landing: 'Landing Page',
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
  const [pixKey, setPixKey] = useState(settings.pixKey)
  const [pixReceiver, setPixReceiver] = useState(settings.pixReceiver)
  const [pixCity, setPixCity] = useState(settings.pixCity)
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
  const sectionTitleClasses = `${isPanel ? 'text-xl' : 'text-2xl'} font-medium`

  const pixPreview = pixKey.trim() && pixReceiver.trim() && pixCity.trim()
    ? createPixCode(pixKey, pixReceiver, pixCity)
    : ''

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
      pixCity: pixCity.trim(),
      pixKey: pixKey.trim(),
      pixReceiver: pixReceiver.trim(),
      recurringDonationUrls: Object.fromEntries(
        Object.entries(recurringDonationUrls).filter(([, url]) => url.trim()).map(([value, url]) => [value, url.trim()]),
      ),
      volunteerFormUrl: volunteerFormUrl.trim(),
    }
    const nextSocialLinks = { facebook: facebook.trim(), instagram: instagram.trim() }
    const urls = mode === 'dogs'
      ? [nextSettings.adoptionFormUrl]
      : mode === 'general'
        ? [nextSocialLinks.facebook, nextSocialLinks.instagram].filter(Boolean)
        : [nextSettings.volunteerFormUrl, ...Object.values(nextSettings.recurringDonationUrls)].filter(Boolean)

    if (!urls.every(isHttpsUrl)) {
      setSaveError('Informe links HTTPS completos e válidos.')
      return
    }
    const pixFields = [nextSettings.pixKey, nextSettings.pixReceiver, nextSettings.pixCity]
    if (mode === 'general' && pixFields.some(Boolean) && !pixFields.every(Boolean)) {
      setSaveError('Preencha chave, recebedor e cidade para habilitar o Pix.')
      return
    }
    const removed = mode === 'general'
      ? [socialLinks.facebook && !nextSocialLinks.facebook, socialLinks.instagram && !nextSocialLinks.instagram].some(Boolean)
      : mode === 'landing'
        ? [
            Object.keys(settings.recurringDonationUrls).some((value) => !nextSettings.recurringDonationUrls[value]),
            settings.volunteerFormUrl && !nextSettings.volunteerFormUrl,
          ].some(Boolean)
        : false
    if (removed) { setPendingRemoval({ settings: nextSettings, links: nextSocialLinks }); return }
    void persist(nextSettings, nextSocialLinks)
  }

  return (
    <form onSubmit={submit}>
      <div className={isPanel ? 'grid grid-cols-[13rem_minmax(0,1fr)] gap-8' : ''}>
        <div>
          <h2 className={`${isPanel ? 'text-3xl' : 'text-4xl'} font-medium text-marca`}>Editar Valores Padrão</h2>
          <p className={`${isPanel ? 'mt-3 text-xl' : 'mt-2 text-2xl'} font-medium`}>{MODE_TITLE[mode]}</p>
        </div>
        <div className={isPanel ? '' : 'mt-8'}>
          {mode === 'dogs' && (
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
              <span className="mt-2 block text-xs font-normal">Padrão dos CTAs de adoção; cada cão pode ter o próprio link.</span>
            </label>
          )}

          {mode === 'general' && (
            <>
              <section>
                <h3 className={sectionTitleClasses}>Pix (doação e eventos)</h3>
                <p className="mt-1 text-xs font-normal">Usado na doação única e como padrão dos novos eventos. O código copia-e-cola é gerado a partir destes dados, já com o valor de cada pagamento.</p>
                <label htmlFor={`${formId}-pix-key`} className={`${labelClasses} mt-3`}>
                  Chave Pix
                  <TextField id={`${formId}-pix-key`} maxLength={77} value={pixKey} onChange={(event) => setPixKey(event.target.value)} className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-pix-receiver`} className={`${labelClasses} mt-3`}>
                  Nome do recebedor
                  <TextField id={`${formId}-pix-receiver`} maxLength={25} value={pixReceiver} onChange={(event) => setPixReceiver(event.target.value)} className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-pix-city`} className={`${labelClasses} mt-3`}>
                  Cidade
                  <TextField id={`${formId}-pix-city`} maxLength={15} value={pixCity} onChange={(event) => setPixCity(event.target.value)} className={fieldClasses} />
                </label>
                {pixPreview && (
                  <p className="mt-3 rounded-lg bg-cinza-claro px-3 py-2 text-xs font-normal break-all text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
                    <span className="font-medium">Pix copia-e-cola (sem valor):</span> {pixPreview}
                  </p>
                )}
              </section>
              <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
                <h3 className={sectionTitleClasses}>Redes sociais</h3>
                <p className="mt-1 text-xs font-normal">Exibidas no rodapé de todas as páginas. Redes sem link ficam ocultas.</p>
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

          {mode === 'landing' && (
            <>
              <section>
                <h3 className={sectionTitleClasses}>Doação recorrente via PagSeguro</h3>
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
                <h3 className={sectionTitleClasses}>Outros links da página</h3>
                <label htmlFor={`${formId}-volunteer`} className={`${labelClasses} mt-3`}>
                  Formulário de voluntariado
                  <TextField id={`${formId}-volunteer`} type="url" value={volunteerFormUrl} onChange={(event) => setVolunteerFormUrl(event.target.value)} placeholder="https://forms.gle/..." className={fieldClasses} />
                </label>
                <p className="mt-2 text-xs">Valores recorrentes sem link e CTAs sem destino ficam indisponíveis no site.</p>
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
