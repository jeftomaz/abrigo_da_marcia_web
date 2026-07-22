import { useId, useState } from 'react'
import { Action } from '@abrigo/shared'
import type { SiteSettings, SocialLinks } from '@abrigo/shared'

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
  const [donationUrl, setDonationUrl] = useState(settings.donationUrl)
  const [volunteerFormUrl, setVolunteerFormUrl] = useState(settings.volunteerFormUrl)
  const [facebook, setFacebook] = useState(socialLinks.facebook)
  const [instagram, setInstagram] = useState(socialLinks.instagram)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'} mt-1 w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const labelClasses = `${isPanel ? 'text-sm' : 'text-base'} block font-medium`

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextSettings: SiteSettings = {
      adoptionFormUrl: adoptionFormUrl.trim(),
      donationUrl: donationUrl.trim(),
      volunteerFormUrl: volunteerFormUrl.trim(),
    }
    const nextSocialLinks = { facebook: facebook.trim(), instagram: instagram.trim() }
    const urls = mode === 'dogs'
      ? [nextSettings.adoptionFormUrl]
      : [nextSettings.donationUrl, nextSettings.volunteerFormUrl, nextSocialLinks.facebook, nextSocialLinks.instagram].filter(Boolean)

    if (!urls.every(isHttpsUrl)) {
      setSaveError('Informe links HTTPS completos e válidos.')
      return
    }
    if (mode === 'landing') {
      const removed = [
        settings.donationUrl && !nextSettings.donationUrl,
        settings.volunteerFormUrl && !nextSettings.volunteerFormUrl,
        socialLinks.facebook && !nextSocialLinks.facebook,
        socialLinks.instagram && !nextSocialLinks.instagram,
      ].some(Boolean)
      if (removed && !window.confirm('Os botões ou redes sem link serão ocultados do site público. Deseja continuar?')) return
    }

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
              <input
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
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Links da página</h3>
                <label htmlFor={`${formId}-donation`} className={`${labelClasses} mt-3`}>
                  Doação
                  <input id={`${formId}-donation`} type="url" value={donationUrl} onChange={(event) => setDonationUrl(event.target.value)} placeholder="https://..." className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-volunteer`} className={`${labelClasses} mt-3`}>
                  Formulário de voluntariado
                  <input id={`${formId}-volunteer`} type="url" value={volunteerFormUrl} onChange={(event) => setVolunteerFormUrl(event.target.value)} placeholder="https://forms.gle/..." className={fieldClasses} />
                </label>
                <p className="mt-2 text-xs">Ao deixar um link vazio, o CTA correspondente é ocultado.</p>
              </section>
              <section className="mt-5 border-t border-cinza-medio pt-4 dark:border-cinza-claro">
                <h3 className={`${isPanel ? 'text-xl' : 'text-2xl'} font-medium`}>Redes sociais</h3>
                <label htmlFor={`${formId}-facebook`} className={`${labelClasses} mt-3`}>
                  Facebook
                  <input id={`${formId}-facebook`} type="url" value={facebook} onChange={(event) => setFacebook(event.target.value)} placeholder="https://facebook.com/..." className={fieldClasses} />
                </label>
                <label htmlFor={`${formId}-instagram`} className={`${labelClasses} mt-3`}>
                  Instagram
                  <input id={`${formId}-instagram`} type="url" value={instagram} onChange={(event) => setInstagram(event.target.value)} placeholder="https://instagram.com/..." className={fieldClasses} />
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
    </form>
  )
}
