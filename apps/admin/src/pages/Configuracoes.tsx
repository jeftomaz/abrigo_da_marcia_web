import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  Action,
  Dialog,
  useAdminSiteSettings,
  useAdminSocialLinks,
  useEventSettings,
  useSaveEventSettings,
  useSaveSiteSettings,
  useSaveSocialLinks,
} from '@abrigo/shared'
import type { EventSettings, SiteSettings, SocialLinks } from '@abrigo/shared'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { AdminListRow } from '../components/AdminListRow'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { EventSettingsForm } from '../components/EventSettingsForm'
import { GlobalSettingsForm } from '../components/GlobalSettingsForm'
import { StatusBadge } from '../components/StatusBadge'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useSuccessMessage } from '../hooks/useSuccessMessage'

type Editor = 'dogs' | 'events' | 'landing'

type SettingsCardProps = {
  actions: ReactNode
  details: string[]
  isEditing?: boolean
  status?: ReactNode
  title: string
}

function SettingsCard({ actions, details, isEditing = false, status, title }: SettingsCardProps) {
  return (
    <AdminListRow isEditing={isEditing} className="flex min-h-40 flex-col rounded-3xl p-5 desk:min-h-32 desk:rounded-2xl desk:p-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-medium desk:text-lg">{title}</h3>
        {status}
      </div>
      <ul className="mt-1 list-inside list-disc text-base leading-snug desk:text-sm">
        {details.map((detail) => <li key={detail}>{detail}</li>)}
      </ul>
      <div className="mt-auto flex justify-end pt-5 desk:pt-3">{actions}</div>
    </AdminListRow>
  )
}

function formatExpiration(minutes: number) {
  if (minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  return `${minutes} minutos`
}

function configurationStatus(value: string) {
  return value ? 'configurado' : 'não configurado'
}

export function Configuracoes() {
  const { email, removeAuthenticator } = useAdminAuth()
  const { data: siteSettings, error: siteError, isLoading: isLoadingSite } = useAdminSiteSettings()
  const { data: socialLinks, error: socialError, isLoading: isLoadingSocial } = useAdminSocialLinks()
  const { data: eventSettings, error: eventError, isLoading: isLoadingEvents } = useEventSettings()
  const saveSiteSettings = useSaveSiteSettings()
  const saveSocialLinks = useSaveSocialLinks()
  const saveEventSettings = useSaveEventSettings()
  const [editor, setEditor] = useState<Editor | null>(null)
  const [securityError, setSecurityError] = useState('')
  const [confirmMfaRemoval, setConfirmMfaRemoval] = useState(false)
  const [successMessage, showSuccess] = useSuccessMessage()
  const isDesktop = useIsDesktop()

  const saveGlobalSettings = async (settings: SiteSettings, links: SocialLinks) => {
    if (editor === 'landing') await saveSocialLinks.mutateAsync(links)
    await saveSiteSettings.mutateAsync(settings)
    setEditor(null)
    showSuccess('Configurações salvas.')
  }

  const saveEvents = async (settings: EventSettings) => {
    await saveEventSettings.mutateAsync(settings)
    setEditor(null)
    showSuccess('Configurações salvas.')
  }

  const removeMfa = async () => {
    setSecurityError('')
    try {
      await removeAuthenticator()
      setConfirmMfaRemoval(false)
    } catch {
      setSecurityError('Não foi possível remover o autenticador.')
    }
  }

  const landingDetails = siteSettings && socialLinks ? [
    `Pix para doação única: ${configurationStatus(siteSettings.donationPixKey && siteSettings.donationPixReceiver && siteSettings.donationPixCity)}`,
    `Links de doação recorrente: ${Object.keys(siteSettings.recurringDonationUrls).length}/6 configurados`,
    `Formulário de voluntariado: ${configurationStatus(siteSettings.volunteerFormUrl)}`,
    `Facebook: ${configurationStatus(socialLinks.facebook)}`,
    `Instagram: ${configurationStatus(socialLinks.instagram)}`,
  ] : ['Doação, voluntariado e redes sociais']
  const eventDetails = eventSettings ? [
    `Limite de produtos por reserva: ${eventSettings.defaultMaxProductUnits}`,
    `Limite de números de rifa por reserva: ${eventSettings.defaultMaxRaffleNumbers}`,
    `Tempo de expiração: ${formatExpiration(eventSettings.defaultReservationTtlMinutes)}`,
    `Chave Pix: ${configurationStatus(eventSettings.defaultPixKey)}`,
    `Recebedor do Pix: ${configurationStatus(eventSettings.defaultPixReceiver)}`,
    `Cidade do Pix: ${configurationStatus(eventSettings.defaultPixCity)}`,
    `Pix copia-e-cola: ${configurationStatus(eventSettings.defaultPixCopyPaste)}`,
    `Instrução pós-pagamento: ${configurationStatus(eventSettings.defaultPostPaymentInstructions)}`,
    `E-mail para exportação automática: ${configurationStatus(eventSettings.eventExportEmail)}`,
  ] : ['Limites, pagamento, expiração e auditoria das reservas']

  const editorContent = editor === 'events' && eventSettings ? (
    <EventSettingsForm layout={isDesktop ? 'panel' : 'modal'} settings={eventSettings} onCancel={() => setEditor(null)} onSave={saveEvents} />
  ) : editor && editor !== 'events' && siteSettings && (editor === 'dogs' || socialLinks) ? (
    <GlobalSettingsForm
      layout={isDesktop ? 'panel' : 'modal'}
      mode={editor}
      settings={siteSettings}
      socialLinks={socialLinks ?? { facebook: '', instagram: '' }}
      onCancel={() => setEditor(null)}
      onSave={saveGlobalSettings}
    />
  ) : null

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-10 ${editor ? 'desk:max-w-[80rem] desk:grid-cols-[29rem_minmax(36rem,45rem)] desk:justify-between' : 'desk:max-w-[29rem]'}`}>
        <section aria-labelledby="settings-title" className="min-w-0">
          <h1 id="settings-title" className="text-4xl font-medium sm:text-5xl desk:text-4xl">Configurações</h1>
          {successMessage && <p role="status" className="mt-3 text-sm font-medium text-status-verde-on-surface">{successMessage}</p>}
          <div className="mt-6 flex flex-col gap-6 desk:mt-3 desk:gap-4">
            <section aria-labelledby="landing-settings-title">
              <h2 id="landing-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Landing Page</h2>
              <SettingsCard
                title="Links e redes sociais"
                details={landingDetails}
                isEditing={editor === 'landing'}
                actions={<Action onClick={() => setEditor('landing')} disabled={!siteSettings || !socialLinks || isLoadingSite || isLoadingSocial} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {(isLoadingSite || isLoadingSocial) && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {(siteError || socialError) && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar os links públicos.</p>}
            </section>

            <section aria-labelledby="dogs-settings-title">
              <h2 id="dogs-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Gestão de Cães</h2>
              <SettingsCard
                title="Dados e valores padrão"
                details={siteSettings ? [`Formulário global de adoção: ${configurationStatus(siteSettings.adoptionFormUrl)}`] : ['Formulário global de adoção']}
                isEditing={editor === 'dogs'}
                actions={<Action onClick={() => setEditor('dogs')} disabled={!siteSettings || isLoadingSite} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {isLoadingSite && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {siteError && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar o link global de adoção.</p>}
            </section>

            <section aria-labelledby="events-settings-title">
              <h2 id="events-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Gestão de Eventos</h2>
              <SettingsCard
                title="Dados e valores padrão"
                details={eventDetails}
                isEditing={editor === 'events'}
                actions={<Action onClick={() => setEditor('events')} disabled={!eventSettings || isLoadingEvents} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {isLoadingEvents && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {eventError && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar os valores padrão de Eventos.</p>}
            </section>

            <section aria-labelledby="security-settings-title">
              <h2 id="security-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Segurança</h2>
              <SettingsCard
                title="Autenticação em 2 fatores (2FA)"
                details={[`Autenticador TOTP ativo para ${email}`, 'Sessão encerrada após 7 dias sem atividade']}
                status={<StatusBadge tone="verde" size="sm">Ativa</StatusBadge>}
                actions={<Action onClick={() => setConfirmMfaRemoval(true)} icon="trash-solid" size="small" variant="neutral-adaptive" className="h-11 px-5">Remover</Action>}
              />
              {securityError && <p role="alert" className="mt-2 text-sm font-medium text-marca">{securityError}</p>}
            </section>
          </div>
        </section>

        {editorContent && isDesktop && <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">{editorContent}</aside>}
      </div>

      {editorContent && !isDesktop && (
        <Dialog ariaLabel="Editar configurações" onClose={() => setEditor(null)} className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-12">
          {editorContent}
        </Dialog>
      )}
      {confirmMfaRemoval && <ConfirmationDialog title="Remover autenticador" description="A sessão será encerrada e uma nova ativação será exigida no próximo acesso." onCancel={() => setConfirmMfaRemoval(false)} onConfirm={() => void removeMfa()} />}
    </main>
  )
}
