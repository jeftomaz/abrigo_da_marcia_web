import type { ReactNode } from 'react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Action,
  Dialog,
  getAdminErrorMessage,
  useCareCategories,
  useCareFrequencies,
  useAdminSiteSettings,
  useAdminSocialLinks,
  useEventSettings,
  useSaveCareCategories,
  useSaveEventSettings,
  useSaveCareFrequencies,
  useSaveSiteSettings,
  useSaveSocialLinks,
} from '@abrigo/shared'
import type { AuditMetadata, CareCategoryDraft, CareFrequencyDraft, EventSettings, SiteSettings, SocialLinks } from '@abrigo/shared'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { AuthenticatorCodeForm } from '../auth/AuthenticatorCodeForm'
import { PasswordChangeForm } from '../auth/PasswordChangeForm'
import { AdminListRow } from '../components/AdminListRow'
import { ConfirmationDialog } from '../components/ConfirmationDialog'
import { CareCategorySettingsForm } from '../components/CareCategorySettingsForm'
import { CareFrequencySettingsForm } from '../components/CareFrequencySettingsForm'
import { EventSettingsForm } from '../components/EventSettingsForm'
import { GlobalSettingsForm } from '../components/GlobalSettingsForm'
import { StatusBadge } from '../components/StatusBadge'
import { useIsDesktop } from '../hooks/useIsDesktop'
import { useSuccessMessage } from '../hooks/useSuccessMessage'

type Editor = 'care-categories' | 'care-frequencies' | 'dogs' | 'events' | 'general' | 'landing'
type SecurityDialog = 'password' | 'verification'

type SettingsCardProps = {
  actions: ReactNode
  audit?: AuditMetadata | null
  details: string[]
  isEditing?: boolean
  status?: ReactNode
  title: string
}

function SettingsCard({ actions, audit, details, isEditing = false, status, title }: SettingsCardProps) {
  return (
    <AdminListRow audit={audit} isEditing={isEditing} className="flex min-h-40 flex-col rounded-3xl p-5 desk:min-h-32 desk:rounded-2xl desk:p-4">
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

function latestAudit(...audits: Array<AuditMetadata | null | undefined>) {
  return audits.filter((audit): audit is AuditMetadata => Boolean(audit))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
}

export function Configuracoes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { displayName, email, removeAuthenticator, updatePassword, verifyAuthenticator } = useAdminAuth()
  const { data: siteSettings, error: siteError, isLoading: isLoadingSite } = useAdminSiteSettings()
  const { data: socialLinks, error: socialError, isLoading: isLoadingSocial } = useAdminSocialLinks()
  const { data: eventSettings, error: eventError, isLoading: isLoadingEvents } = useEventSettings()
  const { data: careCategories, error: categoryError, isLoading: isLoadingCategories } = useCareCategories()
  const { data: careFrequencies, error: careError, isLoading: isLoadingCare } = useCareFrequencies()
  const saveSiteSettings = useSaveSiteSettings()
  const saveSocialLinks = useSaveSocialLinks()
  const saveEventSettings = useSaveEventSettings()
  const saveCareCategories = useSaveCareCategories()
  const saveCareFrequencies = useSaveCareFrequencies()
  const [editor, setEditor] = useState<Editor | null>(() => {
    const requestedEditor = searchParams.get('editor')
    return requestedEditor === 'care-categories' || requestedEditor === 'care-frequencies'
      ? requestedEditor
      : null
  })
  const [securityError, setSecurityError] = useState('')
  const [confirmMfaRemoval, setConfirmMfaRemoval] = useState(false)
  const [securityDialog, setSecurityDialog] = useState<SecurityDialog | null>(null)
  const [successMessage, showSuccess] = useSuccessMessage()
  const isDesktop = useIsDesktop()

  const closeEditor = () => {
    setEditor(null)
    if (searchParams.has('editor')) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('editor')
      setSearchParams(nextParams, { replace: true })
    }
  }

  const saveGlobalSettings = async (settings: SiteSettings, links: SocialLinks) => {
    if (editor === 'general') await saveSocialLinks.mutateAsync(links)
    await saveSiteSettings.mutateAsync(settings)
    closeEditor()
    showSuccess('Configurações salvas.')
  }

  const saveEvents = async (settings: EventSettings) => {
    await saveEventSettings.mutateAsync(settings)
    closeEditor()
    showSuccess('Configurações salvas.')
  }

  const saveCare = async (frequencies: CareFrequencyDraft[]) => {
    await saveCareFrequencies.mutateAsync(frequencies)
    closeEditor()
    showSuccess('Frequências de Cuidados salvas.')
  }

  const saveCategories = async (categories: CareCategoryDraft[]) => {
    await saveCareCategories.mutateAsync(categories)
    closeEditor()
    showSuccess('Categorias de Cuidados salvas.')
  }

  const removeMfa = async () => {
    setSecurityError('')
    try {
      await removeAuthenticator()
      setConfirmMfaRemoval(false)
    } catch (error) {
      setSecurityError(getAdminErrorMessage(error, 'Não foi possível remover o autenticador.'))
    }
  }

  const verifyPasswordChange = async (code: string) => {
    await verifyAuthenticator(code)
    setSecurityDialog('password')
  }

  const changePassword = async (password: string) => {
    await updatePassword(password)
    setSecurityDialog(null)
    showSuccess('Senha alterada.')
  }

  const generalDetails = siteSettings && socialLinks ? [
    `Pix (doação e eventos): ${configurationStatus(siteSettings.pixKey && siteSettings.pixReceiver && siteSettings.pixCity)}`,
    `Facebook: ${configurationStatus(socialLinks.facebook)}`,
    `Instagram: ${configurationStatus(socialLinks.instagram)}`,
  ] : ['Pix compartilhado e redes sociais']
  const landingDetails = siteSettings ? [
    `Links de doação recorrente: ${Object.keys(siteSettings.recurringDonationUrls).length}/6 configurados`,
    `Formulário de voluntariado: ${configurationStatus(siteSettings.volunteerFormUrl)}`,
  ] : ['Doação recorrente e voluntariado']
  const eventDetails = eventSettings ? [
    `Limite de produtos por reserva: ${eventSettings.defaultMaxProductUnits}`,
    `Limite de números de rifa por reserva: ${eventSettings.defaultMaxRaffleNumbers}`,
    `Tempo de expiração: ${formatExpiration(eventSettings.defaultReservationTtlMinutes)}`,
    `Instrução pós-pagamento: ${configurationStatus(eventSettings.defaultPostPaymentInstructions)}`,
    `E-mail para exportação automática: ${configurationStatus(eventSettings.eventExportEmail)}`,
  ] : ['Limites, pagamento, expiração e auditoria das reservas']
  const frequencyDetails = careFrequencies ? [
    '5 frequências preestabelecidas',
    `${careFrequencies.filter((frequency) => !frequency.predefined && frequency.active).length} personalizada(s) disponível(is)`,
    'Cálculo automático da próxima administração',
  ] : ['Frequências de administração dos itens']
  const categoryDetails = careCategories ? [
    `${careCategories.filter((category) => category.active).length} categoria(s) disponível(is)`,
    'Lista usada no cadastro dos itens',
  ] : ['Categorias dos itens de cuidado']

  const editorContent = editor === 'care-categories' && careCategories ? (
    <CareCategorySettingsForm layout={isDesktop ? 'panel' : 'modal'} categories={careCategories} onCancel={closeEditor} onSave={saveCategories} />
  ) : editor === 'care-frequencies' && careFrequencies ? (
    <CareFrequencySettingsForm layout={isDesktop ? 'panel' : 'modal'} frequencies={careFrequencies} onCancel={closeEditor} onSave={saveCare} />
  ) : editor === 'events' && eventSettings ? (
    <EventSettingsForm layout={isDesktop ? 'panel' : 'modal'} settings={eventSettings} onCancel={closeEditor} onSave={saveEvents} />
  ) : editor && editor !== 'care-categories' && editor !== 'care-frequencies' && editor !== 'events' && siteSettings && ((editor !== 'general') || socialLinks) ? (
    <GlobalSettingsForm
      layout={isDesktop ? 'panel' : 'modal'}
      mode={editor}
      settings={siteSettings}
      socialLinks={socialLinks ?? { facebook: '', instagram: '' }}
      onCancel={closeEditor}
      onSave={saveGlobalSettings}
    />
  ) : null

  return (
    <main className="flex-1 overflow-x-clip bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-10 ${editor ? 'desk:max-w-[80rem] desk:grid-cols-[29rem_minmax(36rem,45rem)] desk:justify-between' : 'desk:max-w-[29rem]'}`}>
        <section aria-labelledby="settings-title" className="min-w-0">
          <h1 id="settings-title" className="text-4xl font-medium text-marca sm:text-5xl desk:text-4xl">Configurações</h1>
          {successMessage && <p role="status" className="mt-3 text-sm font-medium text-status-verde-on-surface">{successMessage}</p>}
          <div className="mt-6 flex flex-col gap-6 desk:mt-3 desk:gap-4">
            <section aria-labelledby="general-settings-title">
              <h2 id="general-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Configurações gerais</h2>
              <SettingsCard
                audit={latestAudit(siteSettings?.audit, socialLinks?.audit)}
                title="Pix e redes sociais"
                details={generalDetails}
                isEditing={editor === 'general'}
                actions={<Action onClick={() => setEditor('general')} disabled={!siteSettings || !socialLinks || isLoadingSite || isLoadingSocial} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {(isLoadingSite || isLoadingSocial) && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {(siteError || socialError) && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar os links públicos.</p>}
            </section>

            <section aria-labelledby="landing-settings-title">
              <h2 id="landing-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Landing Page</h2>
              <SettingsCard
                audit={siteSettings?.audit}
                title="Doação recorrente e voluntariado"
                details={landingDetails}
                isEditing={editor === 'landing'}
                actions={<Action onClick={() => setEditor('landing')} disabled={!siteSettings || isLoadingSite} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {isLoadingSite && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {siteError && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar os links públicos.</p>}
            </section>

            <section aria-labelledby="dogs-settings-title">
              <h2 id="dogs-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Gestão de Cães</h2>
              <SettingsCard
                audit={siteSettings?.audit}
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
                audit={eventSettings?.audit}
                title="Dados e valores padrão"
                details={eventDetails}
                isEditing={editor === 'events'}
                actions={<Action onClick={() => setEditor('events')} disabled={!eventSettings || isLoadingEvents} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
              />
              {isLoadingEvents && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {eventError && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar os valores padrão de Eventos.</p>}
            </section>

            <section aria-labelledby="care-settings-title">
              <h2 id="care-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Gestão de Cuidados</h2>
              <div className="flex flex-col gap-3">
                <SettingsCard
                  audit={latestAudit(...(careCategories?.map((category) => category.audit) ?? []))}
                  title="Categorias dos itens"
                  details={categoryDetails}
                  isEditing={editor === 'care-categories'}
                  actions={<Action onClick={() => setEditor('care-categories')} disabled={!careCategories || isLoadingCategories} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
                />
                <SettingsCard
                  audit={latestAudit(...(careFrequencies?.map((frequency) => frequency.audit) ?? []))}
                  title="Frequências de administração"
                  details={frequencyDetails}
                  isEditing={editor === 'care-frequencies'}
                  actions={<Action onClick={() => setEditor('care-frequencies')} disabled={!careFrequencies || isLoadingCare} icon="edit-pencil" size="small" variant="neutral-adaptive" className="h-11 px-5">Editar</Action>}
                />
              </div>
              {(isLoadingCategories || isLoadingCare) && <p role="status" className="mt-2 text-sm">Carregando...</p>}
              {(categoryError || careError) && <p role="alert" className="mt-2 text-sm font-medium text-marca">Não foi possível carregar as listas de Cuidados.</p>}
            </section>

            <section aria-labelledby="security-settings-title">
              <h2 id="security-settings-title" className="mb-3 text-3xl font-medium desk:mb-2 desk:text-2xl">Segurança</h2>
              <SettingsCard
                title="Autenticação em 2 fatores (2FA)"
                details={[`Perfil: ${displayName}`, `Autenticador TOTP ativo para ${email}`, 'Sessão encerrada após 7 dias sem atividade']}
                status={<StatusBadge tone="verde" size="sm">Ativa</StatusBadge>}
                actions={(
                  <div className="flex flex-wrap justify-end gap-3">
                    <Action onClick={() => setSecurityDialog('verification')} size="small" variant="neutral-adaptive" className="h-11 px-5">Alterar senha</Action>
                    <Action onClick={() => setConfirmMfaRemoval(true)} icon="trash-solid" size="small" variant="neutral-adaptive" className="h-11 px-5">Remover 2FA</Action>
                  </div>
                )}
              />
              {securityError && <p role="alert" className="mt-2 text-sm font-medium text-marca">{securityError}</p>}
            </section>
          </div>
        </section>

        {editorContent && isDesktop && (
          <aside className="sticky top-20 max-h-[calc(100dvh-6rem)] w-full overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            {editorContent}
          </aside>
        )}
      </div>

      {editorContent && !isDesktop && (
        <Dialog ariaLabel="Editar configurações" onClose={closeEditor} className="max-h-[94vh] w-full max-w-[55rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-12">
          {editorContent}
        </Dialog>
      )}
      {securityDialog && (
        <Dialog ariaLabel="Alterar senha" onClose={() => setSecurityDialog(null)} className="w-full max-w-md rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-10">
          {securityDialog === 'verification' ? (
            <AuthenticatorCodeForm
              embedded
              title="Confirmar alteração de senha"
              description="Informe um novo código do autenticador antes de definir a nova senha."
              onSubmit={verifyPasswordChange}
            />
          ) : (
            <PasswordChangeForm
              embedded
              title="Alterar senha"
              description={`Defina a nova senha de acesso para ${email}.`}
              onCancel={() => setSecurityDialog(null)}
              onSubmit={changePassword}
            />
          )}
        </Dialog>
      )}
      {confirmMfaRemoval && <ConfirmationDialog title="Remover autenticador" description="A sessão será encerrada e uma nova ativação será exigida no próximo acesso." onCancel={() => setConfirmMfaRemoval(false)} onConfirm={() => void removeMfa()} />}
    </main>
  )
}
