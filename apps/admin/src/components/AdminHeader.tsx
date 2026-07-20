import { Link, useLocation } from 'react-router-dom'
import { Action, Icon, Logo, useTheme } from '@abrigo/shared'

type NavItem = {
  label: string
  to?: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Cães', to: '/' },
  { label: 'Histórias', to: '/historias' },
  { label: 'Eventos', to: '/eventos' },
  { label: 'Configurações' },
]

const ADMIN_THEME_ICON_CLASSES =
  'size-7 desk:size-10 [&_circle]:!fill-cinza-claro [&_path]:!fill-cinza-escuro hover:[&_circle]:!fill-cinza-medio hover:[&_path]:!fill-cinza-claro active:[&_circle]:!fill-cinza-escuro active:[&_path]:!fill-cinza-claro dark:[&_circle]:!fill-cinza-medio dark:[&_path]:!fill-cinza-claro dark:hover:[&_circle]:!fill-cinza-claro dark:hover:[&_path]:!fill-cinza-escuro dark:active:[&_circle]:!fill-cinza-escuro dark:active:[&_path]:!fill-cinza-claro'

const NAV_ITEM_CLASSES =
  'h-10 shrink-0 px-7 text-base desk:h-8 desk:min-w-28 desk:px-5 desk:text-sm'
const DISABLED_NAV_ITEM_CLASSES =
  'disabled:opacity-100'

export function AdminHeader() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 overflow-hidden bg-surface-raised text-on-surface-raised">
      <div className="mx-auto flex min-w-0 max-w-[1920px] flex-wrap items-center justify-between gap-x-3 gap-y-4 px-4 py-2 sm:px-6 desk:flex-nowrap desk:gap-6 desk:py-4">
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Logo className="h-9 w-auto sm:h-10" />
          <span className="text-xl font-medium sm:text-2xl">Admin</span>
        </Link>

        <nav className="order-2 flex min-w-0 basis-full gap-3 overflow-x-auto desk:basis-auto desk:flex-1 desk:justify-center">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.to

            return item.to ? (
              <Action
                key={item.label}
                to={item.to}
                variant={isActive ? 'primary' : 'neutral-adaptive'}
                size="small"
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
                size="small"
                className={`${NAV_ITEM_CLASSES} ${DISABLED_NAV_ITEM_CLASSES}`}
              >
                {item.label}
              </Action>
            )
          })}
        </nav>

        <div className="order-1 flex shrink-0 items-center gap-3 desk:order-3 desk:gap-4">
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
            disabled
            variant="neutral-adaptive"
            size="small"
            className={`h-8 px-3 desk:h-10 desk:px-5 ${DISABLED_NAV_ITEM_CLASSES}`}
          >
            Sair
          </Action>
        </div>
      </div>
    </header>
  )
}
