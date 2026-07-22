import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Action, Logo, supabase } from '@abrigo/shared'
import { AdminAuthContext } from './AdminAuthContext'

const LAST_ACTIVITY_KEY = 'abrigo-admin-last-activity-at'
const INACTIVITY_LIMIT_MS = 7 * 24 * 60 * 60 * 1000

type AuthState =
  | { status: 'checking' }
  | { status: 'challenge'; email: string; factorId: string }
  | { status: 'enroll'; email: string }
  | { status: 'forbidden' }
  | { status: 'ready'; email: string; factorId: string }
  | { status: 'signed-out' }

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

const fieldClasses = 'mt-1 h-11 w-full rounded-lg border-2 border-cinza-medio bg-transparent px-4 text-current outline-none focus-visible:border-marca dark:border-cinza-claro'

function Login({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

  return (
    <AuthLayout>
      <form onSubmit={submit}>
        <h1 className="text-3xl font-medium text-marca">Acesso administrativo</h1>
        <label className="mt-6 block font-medium">
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClasses} />
        </label>
        <label className="mt-4 block font-medium">
          Senha
          <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={fieldClasses} />
        </label>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
        <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </Action>
      </form>
    </AuthLayout>
  )
}

function CodeForm({
  description,
  embedded = false,
  onSubmit,
  title,
}: {
  description: string
  embedded?: boolean
  onSubmit: (code: string) => Promise<void>
  title: string
}) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!/^\d{6}$/.test(code)) {
      setError('Informe o código de 6 dígitos.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await onSubmit(code)
    } catch {
      setError('Código inválido ou expirado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const Heading = embedded ? 'h2' : 'h1'

  return (
    <form onSubmit={submit}>
      <Heading className="text-3xl font-medium text-marca">{title}</Heading>
      <p className="mt-3">{description}</p>
      <label className="mt-6 block font-medium">
        Código do autenticador
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className={`${fieldClasses} text-center text-2xl tracking-[0.35em]`}
        />
      </label>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-marca">{error}</p>}
      <Action type="submit" disabled={isSubmitting} className="mt-6 w-full px-6">
        {isSubmitting ? 'Verificando...' : 'Verificar'}
      </Action>
    </form>
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
          <CodeForm
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

  const signOut = useCallback(async () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY)
    await supabase.auth.signOut()
    setState({ status: 'signed-out' })
  }, [])

  const inspectSession = useCallback(async (
    session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'],
  ) => {
    if (!session) {
      setState({ status: 'signed-out' })
      return
    }
    if (session.user.app_metadata.role !== 'admin') {
      setState({ status: 'forbidden' })
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
    const email = session.user.email ?? 'administrador'
    if (!factor) {
      setState({ status: 'enroll', email })
      return
    }
    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (assuranceError) throw assuranceError
    setState(assurance.currentLevel === 'aal2'
      ? { status: 'ready', email, factorId: factor.id }
      : { status: 'challenge', email, factorId: factor.id })
  }, [signOut])

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => inspectSession(data.session)).catch(() => setState({ status: 'signed-out' }))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void inspectSession(session).catch(() => setState({ status: 'signed-out' })), 0)
    })
    return () => listener.subscription.unsubscribe()
  }, [inspectSession])

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

  const contextValue = state.status === 'ready' ? {
    email: state.email,
    factorId: state.factorId,
    removeAuthenticator,
    signOut,
  } : null

  if (state.status === 'checking') return <AuthLayout><p className="text-center">Verificando sessão...</p></AuthLayout>
  if (state.status === 'signed-out') return <Login onSubmit={login} />
  if (state.status === 'forbidden') return (
    <AuthLayout>
      <h1 className="text-3xl font-medium text-marca">Acesso negado</h1>
      <p className="mt-3">Esta conta não possui permissão administrativa.</p>
      <Action onClick={() => void signOut()} className="mt-6 w-full px-6">Sair</Action>
    </AuthLayout>
  )
  if (state.status === 'enroll') return <EnrollmentScreen beginEnrollment={beginEnrollment} verify={verify} />
  if (state.status === 'challenge') return (
    <AuthLayout>
      <CodeForm
        title="Confirmação em duas etapas"
        description={`Abra o autenticador vinculado a ${state.email}.`}
        onSubmit={(code) => verify(state.factorId, code)}
      />
    </AuthLayout>
  )
  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>
}
