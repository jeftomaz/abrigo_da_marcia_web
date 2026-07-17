import { Link, useLocation } from 'react-router-dom'
import { Action, Icon, Logo, useTheme } from '@abrigo/shared'

type NavItem = {
  label: string
  to?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Cães', to: '/' },
  { label: 'Histórias' },
  { label: 'Eventos' },
  { label: 'Configurações' },
]

export function AdminHeader() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 overflow-hidden bg-surface-raised text-on-surface-raised">
      <div className="mx-auto flex min-w-0 max-w-[1920px] flex-wrap items-center justify-between gap-x-3 gap-y-4 px-4 py-4 sm:px-6 desk:flex-nowrap desk:gap-6">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Logo className="h-9 w-auto sm:h-10" />
          <span className="text-xl font-medium sm:text-2xl">Admin</span>
        </Link>

        <nav className="order-2 flex min-w-0 basis-full gap-3 overflow-x-auto desk:basis-auto desk:flex-1 desk:justify-center">
          {NAV_ITEMS.map((item) =>
            item.to ? (
              <Action
                key={item.label}
                to={item.to}
                variant={pathname === item.to ? 'neutral-inverted' : 'neutral'}
                size="small"
                aria-current={pathname === item.to ? 'page' : undefined}
                className={`h-10 shrink-0 px-7 text-base desk:h-8 desk:min-w-28 desk:px-5 desk:text-sm ${
                  pathname === item.to
                    ? 'desk:bg-marca desk:text-marca-clara dark:bg-cinza-claro dark:text-cinza-escuro desk:dark:bg-marca desk:dark:text-marca-clara'
                    : ''
                }`}
              >
                {item.label}
              </Action>
            ) : (
              <Action
                key={item.label}
                disabled
                variant="neutral"
                size="small"
                className="h-10 shrink-0 bg-cinza-claro px-7 text-base text-cinza-escuro disabled:opacity-100 desk:h-8 desk:min-w-28 desk:px-5 desk:text-sm dark:bg-cinza-medio dark:text-cinza-claro"
              >
                {item.label}
              </Action>
            ),
          )}
        </nav>

        <div className="order-1 flex shrink-0 items-center gap-2 desk:order-3 desk:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className="shrink-0"
          >
            <Icon name={theme === 'dark' ? 'half-moon' : 'sun-light'} className="size-10" />
          </button>
          <Action
            disabled
            variant="neutral"
            size="small"
            className="h-10 px-5 disabled:opacity-100 dark:bg-cinza-medio dark:text-cinza-claro"
          >
            Sair
          </Action>
        </div>
      </div>
    </header>
  )
}
