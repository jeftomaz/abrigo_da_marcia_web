import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Action, Icon, Logo, useTheme } from '@abrigo/shared'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { ConfirmationDialog } from './ConfirmationDialog'

type NavItem = {
  label: string
  to?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Cães', to: '/' },
  { label: 'Histórias', to: '/historias' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Configurações', to: '/configuracoes' },
]

const ADMIN_THEME_ICON_CLASSES =
  'size-7 desk:size-10 [&_circle]:!fill-cinza-claro [&_path]:!fill-cinza-escuro hover:[&_circle]:!fill-cinza-medio hover:[&_path]:!fill-cinza-claro active:[&_circle]:!fill-cinza-escuro active:[&_path]:!fill-cinza-claro dark:[&_circle]:!fill-cinza-medio dark:[&_path]:!fill-cinza-claro dark:hover:[&_circle]:!fill-cinza-claro dark:hover:[&_path]:!fill-cinza-escuro dark:active:[&_circle]:!fill-cinza-escuro dark:active:[&_path]:!fill-cinza-claro'

const NAV_ITEM_CLASSES = 'min-h-12 shrink-0'
const DISABLED_NAV_ITEM_CLASSES =
  'disabled:opacity-100'

export function AdminHeader() {
  const { theme, toggleTheme } = useTheme()
  const { signOut } = useAdminAuth()
  const { pathname } = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    if (window.innerWidth >= 1024) return

    const nav = navRef.current
    const activeItem = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !activeItem) return
    nav.scrollTo({
      left: activeItem.offsetLeft - (nav.clientWidth - activeItem.offsetWidth) / 2,
    })
  }, [pathname])

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface-raised text-on-surface-raised">
        <div className="mx-auto flex min-w-0 max-w-[1920px] flex-wrap items-center justify-between gap-x-3 px-4 py-2 sm:px-6 lg:flex-nowrap lg:gap-6 lg:py-4">
          <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
            <Logo className="h-9 w-auto sm:h-10" />
            <span className="text-xl font-medium sm:text-2xl">Admin</span>
          </Link>

          <nav ref={navRef} aria-label="Navegação administrativa" className="fixed inset-x-0 bottom-0 z-50 order-2 flex w-dvw shrink-0 gap-6 overflow-x-auto bg-surface-raised px-6 py-3 shadow-lg lg:static lg:w-auto lg:min-w-0 lg:shrink lg:basis-auto lg:flex-1 lg:justify-safe-center lg:gap-10 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.to

              return item.to ? (
                <Action
                  key={item.label}
                  to={item.to}
                  variant={isActive ? 'primary' : 'neutral-adaptive'}
                  size="medium"
                  aria-current={isActive ? 'page' : undefined}
                  className={NAV_ITEM_CLASSES}
                >
                  {item.label}
                </Action>
              ) : (
                <Action
                  key={item.label}
                  disabled
                  variant="neutral-adaptive"
                  size="medium"
                  className={`${NAV_ITEM_CLASSES} ${DISABLED_NAV_ITEM_CLASSES}`}
                >
                  {item.label}
                </Action>
              )
            })}
          </nav>

          <div className="order-1 flex shrink-0 items-center gap-3 lg:order-3 lg:gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinza-medio"
            >
              <Icon
                name={theme === 'dark' ? 'half-moon' : 'sun-light'}
                className={ADMIN_THEME_ICON_CLASSES}
              />
            </button>
            <Action
              onClick={() => setConfirmSignOut(true)}
              variant="neutral-adaptive"
              size="small"
              className={`h-8 px-3 desk:h-10 desk:px-5 ${DISABLED_NAV_ITEM_CLASSES}`}
            >
              Sair
            </Action>
          </div>
        </div>
      </header>
      {confirmSignOut && (
        <ConfirmationDialog
          title="Sair da área administrativa"
          description="Deseja encerrar sua sessão? Será necessário entrar novamente com senha e código do autenticador."
          confirmLabel="Sair"
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={() => void signOut()}
        />
      )}
    </>
  )
}
