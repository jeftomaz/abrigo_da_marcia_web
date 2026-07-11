import { Link } from 'react-router-dom'
import { Logo } from './Logo'
import { Icon } from './Icon'
import { useTheme } from '../theme/ThemeProvider'

type NavItem =
  | { label: string; kind: 'anchor'; href: string }
  | { label: string; kind: 'route'; to: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Adoção', kind: 'route', to: '/adocao' },
  { label: 'Doação', kind: 'anchor', href: '#doacao' },
  { label: 'Histórias', kind: 'route', to: '/historias' },
  { label: 'Recãopensa', kind: 'route', to: '/eventos' },
  { label: 'Sobre nós', kind: 'anchor', href: '#sobre-nos' },
  { label: 'Voluntários', kind: 'anchor', href: '#voluntarios' },
]

const pillClasses =
  'shrink-0 whitespace-nowrap rounded-full bg-marca-escura px-6 py-2 font-medium text-marca-clara dark:bg-marca-clara dark:text-marca-escura'

export function Header() {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-marca">
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-4 px-6 py-4 lg:flex-nowrap lg:gap-6">
        <Link to="/" className="shrink-0 text-marca-escura dark:text-marca-clara">
          <Logo className="h-12 w-auto" />
        </Link>

        <nav className="order-2 flex min-w-0 basis-full gap-3 overflow-x-auto lg:basis-auto lg:flex-1 lg:justify-center">
          {NAV_ITEMS.map((item) =>
            item.kind === 'route' ? (
              <Link key={item.label} to={item.to} className={pillClasses}>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href} className={pillClasses}>
                {item.label}
              </a>
            ),
          )}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="order-1 shrink-0 lg:order-3"
        >
          <Icon name={theme === 'dark' ? 'sun-light' : 'half-moon'} className="h-8 w-8" />
        </button>
      </div>
    </header>
  )
}
