import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Action, Icon, Logo, supabase, TextField } from '@abrigo/shared'
import { AuthenticatorCodeForm } from './AuthenticatorCodeForm'
import { AdminAuthContext } from './AdminAuthContext'
import { isStrongPassword, PasswordChangeForm } from './PasswordChangeForm'

const LAST_ACTIVITY_KEY = 'abrigo-admin-last-activity-at'
const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000

type AuthState =
  | { status: 'checking' }
  | { status: 'challenge'; email: string; factorId: string }
  | { status: 'enroll'; email: string }
  | { status: 'forbidden' }
  | { status: 'profile'; email: string; factorId: string; userId: string }
  | { status: 'recovery-challenge'; email: string; factorId: string }
  | { status: 'recovery-password'; email: string }
  | { status: 'recovery-unavailable' }
  | { status: 'registration'; email: string }
  | { status: 'ready'; displayName: string; email: string; factorId: string }
  | { status: 'signed-out'; notice?: string }

type Enrollment = { factorId: string; qrCode: string; secret: string }

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cinza-claro p-4 text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro">
      <section className="w-full max-w-md rounded-3xl bg-surface-raised p-6 text-on-surface-raised shadow-xl sm:p-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          <Logo className="h-12 w-auto" />
          <span className="text-2xl font-medium">Admin</span>
        </div>
        {children}
      </section>
    </main>
  )
}

const fieldClasses = 'mt-1 h-11 px-4'
const isValidDisplayName = (displayName: string) => {
  const length = displayName.trim().length
  return length >= 2 && length <= 60
}
function PasswordRecoveryRequest({
  onBack,
  onSubmit,
}: {
  onBack: () => void
  onSubmit: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(email.trim())
      setIsSent(true)
    } catch {
      setError('Não foi possível enviar o e-mail de recuperação. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      {isSent ? (
        <div>
          <h1 className="text-3xl font-medium text-marca">Confira seu e-mail</h1>
          <p role="status" className="mt-3">
            Se o endereço pertencer a uma conta administrativa, enviaremos um link para redefinir a senha.
          </p>
          <Action onClick={onBack} variant="secondary" className="mt-6 w-full px-6">
            Voltar ao acesso
          </Action>
        </div>
      ) : (
        <form onSubmit={submit}>
          <h1 className="text-3xl font-medium text-marca">Recuperar senha</h1>
          <p className="mt-3">Enviaremos um link de recuperação para o e-mail administrativo.</p>
          <label className="mt-6 block font-medium">
            E-mail
            <TextField type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClasses} />
          </label>
          {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
          <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
            {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </Action>
          <Action onClick={onBack} variant="secondary" className="mt-4 w-full px-6">
            Voltar
          </Action>
        </form>
      )}
    </AuthLayout>
  )
}

function Login({
  notice,
  onRequestReset,
  onSubmit,
}: {
  notice?: string
  onRequestReset: (email: string) => Promise<void>
  onSubmit: (email: string, password: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(email.trim(), password)
    } catch {
      setError('E-mail ou senha inválidos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showRecovery) return (
    <PasswordRecoveryRequest onBack={() => setShowRecovery(false)} onSubmit={onRequestReset} />
  )

  return (
    <AuthLayout>
      <form onSubmit={submit}>
        <h1 className="text-3xl font-medium text-marca">Acesso administrativo</h1>
        {notice && <p role="status" className="mt-3 text-sm font-medium text-status-verde-on-surface">{notice}</p>}
        <label className="mt-6 block font-medium">
          E-mail
          <TextField type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClasses} />
        </label>
        <label className="mt-4 block font-medium">
          Senha
          <div className="relative">
            <TextField
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${fieldClasses} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute top-1 right-0 bottom-0 flex w-11 items-center justify-center text-cinza-medio hover:text-cinza-escuro focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca dark:text-cinza-claro/70 dark:hover:text-cinza-claro"
            >
              <Icon name={showPassword ? 'eye-closed' : 'eye'} className="size-5" />
            </button>
          </div>
        </label>
        <button
          type="button"
          onClick={() => setShowRecovery(true)}
          className="mt-3 text-sm font-medium text-marca underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
        >
          Esqueci a senha
        </button>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
        <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Action>
      </form>
    </AuthLayout>
  )
}

function Registration({
  email,
  onSubmit,
}: {
  email: string
  onSubmit: (displayName: string, password: string) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidDisplayName(displayName)) {
      setError('Informe um nome ou apelido entre 2 e 60 caracteres.')
      return
    }
    if (!isStrongPassword(password)) {
      setError('Use pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.')
      return
    }
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(displayName.trim(), password)
    } catch {
      setError('Não foi possível concluir o cadastro. Solicite um novo convite se o link expirou.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit}>
        <h1 className="text-3xl font-medium text-marca">Concluir cadastro</h1>
        <p className="mt-3">Defina sua senha para acessar a administração do Abrigo da Márcia.</p>
        <label className="mt-6 block font-medium">
          Nome ou apelido
          <TextField autoComplete="name" maxLength={60} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClasses} />
        </label>
        <label className="mt-6 block font-medium">
          E-mail
          <TextField type="email" autoComplete="username" readOnly value={email} className={fieldClasses} />
        </label>
        <label className="mt-4 block font-medium">
          Senha
          <TextField
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={fieldClasses}
            aria-describedby="password-requirements"
          />
        </label>
        <p id="password-requirements" className="mt-2 text-sm">
          Mínimo de 12 caracteres, com maiúscula, minúscula, número e símbolo.
        </p>
        <label className="mt-4 block font-medium">
          Confirmar senha
          <TextField
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            className={fieldClasses}
          />
        </label>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
        <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
          {isSubmitting ? 'Salvando...' : 'Criar senha e continuar'}
        </Action>
      </form>
    </AuthLayout>
  )
}

function ProfileRegistration({
  email,
  onSubmit,
}: {
  email: string
  onSubmit: (displayName: string) => Promise<void>
}) {
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidDisplayName(displayName)) {
      setError('Informe um nome ou apelido entre 2 e 60 caracteres.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(displayName.trim())
    } catch {
      setError('Não foi possível salvar sua identificação.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit}>
        <h1 className="text-3xl font-medium text-marca">Identifique seu perfil</h1>
        <p className="mt-3">Esse nome ou apelido acompanhará as alterações feitas por você.</p>
        <label className="mt-6 block font-medium">
          E-mail
          <TextField type="email" autoComplete="username" readOnly value={email} className={fieldClasses} />
        </label>
        <label className="mt-4 block font-medium">
          Nome ou apelido
          <TextField autoComplete="name" maxLength={60} required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={fieldClasses} />
        </label>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
        <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
          {isSubmitting ? 'Salvando...' : 'Salvar e continuar'}
        </Action>
      </form>
    </AuthLayout>
  )
}

function EnrollmentScreen({
  beginEnrollment,
  verify,
}: {
  beginEnrollment: () => Promise<Enrollment>
  verify: (factorId: string, code: string) => Promise<void>
}) {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const start = async () => {
    setIsLoading(true)
    setError('')
    try {
      setEnrollment(await beginEnrollment())
    } catch {
      setError('Não foi possível iniciar a configuração do autenticador.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      {!enrollment ? (
        <div>
          <h1 className="text-3xl font-medium text-marca">Proteja sua conta</h1>
          <p className="mt-3">O autenticador em duas etapas é obrigatório para acessar a gestão.</p>
          {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
          <Action onClick={() => void start()} disabled={isLoading} className="mt-6 w-full px-6">
            {isLoading ? 'Gerando...' : 'Configurar autenticador'}
          </Action>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-medium text-marca">Ativar autenticador</h1>
          <p className="mt-3">Escaneie o QR Code e confirme com o código exibido no aplicativo.</p>
          <img src={enrollment.qrCode} alt="QR Code para configurar o autenticador" className="mx-auto my-5 size-56 rounded-xl bg-white p-2" />
          <details className="mb-5 text-sm">
            <summary className="cursor-pointer font-medium">Não consigo escanear</summary>
            <code className="mt-2 block break-all rounded-lg bg-cinza-claro p-3 text-cinza-escuro">{enrollment.secret}</code>
          </details>
          <AuthenticatorCodeForm
            title="Confirmar ativação"
            description="Digite o primeiro código gerado pelo aplicativo."
            embedded
            onSubmit={(code) => verify(enrollment.factorId, code)}
          />
        </div>
      )}
    </AuthLayout>
  )
}

export function AdminAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking' })
  const completingRegistration = useRef(false)
  const recoveringPassword = useRef(false)
  const refreshedInvitationRole = useRef(false)

  const signOut = useCallback(async () => {
    recoveringPassword.current = false
    refreshedInvitationRole.current = false
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    await supabase.auth.signOut()
    setState({ status: 'signed-out' })
  }, [])

  const inspectSession = useCallback(async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
  ) => {
    let activeSession = session
    if (!activeSession) {
      setState({ status: 'signed-out' })
      return
    }
    if (
      activeSession.user.app_metadata.role !== 'admin'
      && activeSession.user.invited_at
      && !refreshedInvitationRole.current
    ) {
      refreshedInvitationRole.current = true
      const { data, error } = await supabase.auth.refreshSession()
      if (!error && data.session) activeSession = data.session
    }
    if (activeSession.user.app_metadata.role !== 'admin') {
      setState({ status: 'forbidden' })
      return
    }
    const email = activeSession.user.email ?? 'administrador'
    if (activeSession.user.invited_at && activeSession.user.app_metadata.admin_onboarding_completed !== true) {
      setState({ status: 'registration', email })
      return
    }
    const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
    if (lastActivity && Date.now() - lastActivity > INACTIVITY_LIMIT_MS) {
      await signOut()
      return
    }
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
    if (factorsError) throw factorsError
    const factor = factors.totp.find((item) => item.status === 'verified')
    if (!factor) {
      setState({ status: 'enroll', email })
      return
    }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) throw assuranceError
    if (assurance.currentLevel !== 'aal2') {
      setState({ status: 'challenge', email, factorId: factor.id })
      return
    }
    const { data: profile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('display_name')
      .eq('user_id', activeSession.user.id)
      .maybeSingle()
    if (profileError) throw profileError
    setState(profile
      ? { status: 'ready', displayName: profile.display_name, email, factorId: factor.id }
      : { status: 'profile', email, factorId: factor.id, userId: activeSession.user.id })
  }, [signOut])

  const inspectRecoverySession = useCallback(async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
  ) => {
    recoveringPassword.current = true
    if (!session || session.user.app_metadata.role !== 'admin') {
      setState({ status: 'forbidden' })
      return
    }
    const { data: factors, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    const factor = factors.totp.find((item) => item.status === 'verified')
    if (!factor) {
      setState({ status: 'recovery-unavailable' })
      return
    }
    setState({
      status: 'recovery-challenge',
      email: session.user.email ?? 'administrador',
      factorId: factor.id,
    })
  }, [])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => inspectSession(data.session)).catch(() => setState({ status: 'signed-out' }))
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (completingRegistration.current) return
      if (event === 'PASSWORD_RECOVERY') {
        window.setTimeout(() => void inspectRecoverySession(session).catch(() => setState({ status: 'signed-out' })), 0)
        return
      }
      if (recoveringPassword.current) return
      window.setTimeout(() => void inspectSession(session).catch(() => setState({ status: 'signed-out' })), 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [inspectRecoverySession, inspectSession])

  useEffect(() => {
    if (state.status !== 'ready') return
    let lastWrite = 0
    const registerActivity = () => {
      const previous = Number(localStorage.getItem(LAST_ACTIVITY_KEY))
      const now = Date.now()
      if (previous && now - previous > INACTIVITY_LIMIT_MS) {
        void signOut()
        return
      }
      if (now - lastWrite > 60_000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now))
        lastWrite = now
      }
    }
    registerActivity()
    const interval = window.setInterval(registerActivity, 60_000)
    window.addEventListener('pointerdown', registerActivity)
    window.addEventListener('keydown', registerActivity)
    window.addEventListener('focus', registerActivity)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pointerdown', registerActivity)
      window.removeEventListener('keydown', registerActivity)
      window.removeEventListener('focus', registerActivity)
    }
  }, [signOut, state.status])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await inspectSession(data.session)
  }

  const requestPasswordReset = async (email: string) => {
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) throw error
  }

  const verifyRecovery = async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    const email = state.status === 'recovery-challenge' ? state.email : 'administrador'
    setState({ status: 'recovery-password', email })
  }

  const completePasswordRecovery = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    await supabase.auth.signOut()
    recoveringPassword.current = false
    setState({ status: 'signed-out', notice: 'Senha alterada. Entre novamente com a nova senha.' })
  }

  const completeRegistration = async (displayName: string, password: string) => {
    completingRegistration.current = true
    try {
      const { error: profileError } = await supabase.auth.updateUser({ data: { display_name: displayName } })
      if (profileError) throw profileError
      const { error: passwordError } = await supabase.auth.updateUser({ password })
      if (passwordError) throw passwordError
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) throw refreshError
      await inspectSession(data.session)
    } finally {
      completingRegistration.current = false
    }
  }

  const completeProfile = async (displayName: string) => {
    if (state.status !== 'profile') return
    const { error } = await supabase.from('admin_profiles').insert({
      display_name: displayName,
      user_id: state.userId,
    })
    if (error) throw error
    setState({
      status: 'ready',
      displayName,
      email: state.email,
      factorId: state.factorId,
    })
  }

  const beginEnrollment = async (): Promise<Enrollment> => {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
    if (factorsError) throw factorsError
    const removals = await Promise.all(factors.all
      .filter((factor) => factor.factor_type === 'totp' && factor.status === 'unverified')
      .map((factor) => supabase.auth.mfa.unenroll({ factorId: factor.id })))
    const removalError = removals.find((result) => result.error)?.error
    if (removalError) throw removalError
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Abrigo da Márcia Admin',
    })
    if (error) throw error
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
  }

  const verify = async (factorId: string, code: string) => {
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) throw error
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    const { data } = await supabase.auth.getSession()
    await inspectSession(data.session)
  }

  const removeAuthenticator = async () => {
    if (state.status !== 'ready') return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: state.factorId })
    if (error) throw error
    await signOut()
  }

  const verifyAuthenticator = async (code: string) => {
    if (state.status !== 'ready') throw new Error('Sessão administrativa indisponível.')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: state.factorId, code })
    if (error) throw error
  }

  const updatePassword = async (password: string) => {
    if (state.status !== 'ready') throw new Error('Sessão administrativa indisponível.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }

  const contextValue = state.status === 'ready' ? {
    displayName: state.displayName,
    email: state.email,
    factorId: state.factorId,
    removeAuthenticator,
    signOut,
    updatePassword,
    verifyAuthenticator,
  } : null

  if (state.status === 'checking') return <AuthLayout><p role="status" className="text-center">Verificando sessão...</p></AuthLayout>
  if (state.status === 'signed-out') return <Login notice={state.notice} onRequestReset={requestPasswordReset} onSubmit={login} />
  if (state.status === 'forbidden') return (
    <AuthLayout>
      <h1 className="text-3xl font-medium text-marca">Acesso negado</h1>
      <p className="mt-3">Esta conta não possui permissão administrativa.</p>
      <Action onClick={() => void signOut()} className="mt-6 w-full px-6">Sair</Action>
    </AuthLayout>
  )
  if (state.status === 'registration') return (
    <Registration email={state.email} onSubmit={completeRegistration} />
  )
  if (state.status === 'profile') return (
    <ProfileRegistration email={state.email} onSubmit={completeProfile} />
  )
  if (state.status === 'enroll') return <EnrollmentScreen beginEnrollment={beginEnrollment} verify={verify} />
  if (state.status === 'recovery-unavailable') return (
    <AuthLayout>
      <h1 className="text-3xl font-medium text-marca">Recuperação indisponível</h1>
      <p className="mt-3">Esta conta não possui um autenticador ativo. Solicite ao responsável pelo Supabase a recuperação do acesso.</p>
      <Action onClick={() => void signOut()} className="mt-6 w-full px-6">Voltar ao acesso</Action>
    </AuthLayout>
  )
  if (state.status === 'recovery-challenge') return (
    <AuthLayout>
      <AuthenticatorCodeForm
        title="Confirme sua identidade"
        description={`Antes de redefinir a senha, informe o código do autenticador vinculado a ${state.email}.`}
        onSubmit={(code) => verifyRecovery(state.factorId, code)}
      />
      <Action variant="secondary" onClick={() => void signOut()} className="mt-4 w-full px-6">
        Cancelar recuperação
      </Action>
    </AuthLayout>
  )
  if (state.status === 'recovery-password') return (
    <AuthLayout>
      <PasswordChangeForm
        title="Redefinir senha"
        description={`Defina a nova senha de acesso para ${state.email}.`}
        submitLabel="Salvar nova senha"
        onCancel={() => void signOut()}
        onSubmit={completePasswordRecovery}
      />
    </AuthLayout>
  )
  if (state.status === 'challenge') return (
    <AuthLayout>
      <AuthenticatorCodeForm
        title="Confirmação em duas etapas"
        description={`Abra o autenticador vinculado a ${state.email}.`}
        onSubmit={(code) => verify(state.factorId, code)}
      />
      <Action variant="secondary" onClick={() => void signOut()} className="mt-4 w-full px-6">
        Sair e usar outra conta
      </Action>
    </AuthLayout>
  )
  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>
}
