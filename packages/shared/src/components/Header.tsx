import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { Icon } from './Icon'
import { Action } from './Action'
import { useTheme } from '../theme/ThemeProvider'

const SCROLL_DIRECTION_THRESHOLD = 8

type NavItem =
  | { label: string; kind: 'anchor'; href: string }
  | { label: string; kind: 'route'; to: string }

const NAV_ITEMS: NavItem[] = [
  { label: 'Adoção', kind: 'route', to: '/adocao' },
  { label: 'Doação', kind: 'anchor', href: '/#doacao' },
  { label: 'Histórias', kind: 'route', to: '/historias' },
  { label: 'Recãopensa', kind: 'route', to: '/eventos' },
  { label: 'Sobre nós', kind: 'anchor', href: '/#sobre-nos' },
  { label: 'Voluntários', kind: 'anchor', href: '/#voluntarios' },
]

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollY = useRef(0)
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (window.innerWidth >= 1024) return

    const nav = navRef.current
    const activeItem = nav?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!nav || !activeItem) return

    nav.scrollLeft = activeItem.offsetLeft - (nav.clientWidth - activeItem.offsetWidth) / 2
  }, [pathname])

  useEffect(() => {
    lastScrollY.current = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDistance = currentScrollY - lastScrollY.current

      if (currentScrollY <= 0) {
        setIsVisible(true)
      } else if (Math.abs(scrollDistance) >= SCROLL_DIRECTION_THRESHOLD) {
        setIsVisible(scrollDistance < 0)
        lastScrollY.current = currentScrollY
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      onFocusCapture={() => setIsVisible(true)}
      className={`sticky top-0 z-50 bg-marca transition-transform duration-300 motion-reduce:transition-none ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="mx-auto flex max-w-[1920px] flex-wrap items-center justify-between gap-10 px-6 py-4 lg:flex-nowrap lg:gap-6">
        <Link to="/" className="shrink-0 text-on-brand">
          <Logo className="h-12 w-auto" />
        </Link>

        <nav ref={navRef} className="order-2 flex min-w-0 basis-full gap-10 overflow-x-auto lg:basis-auto lg:flex-1 lg:justify-center">
          {NAV_ITEMS.map((item) => {
            const isActive = item.kind === 'route' && pathname === item.to
            const usesPrimaryVariant = isLanding
              ? theme === 'light'
              : isActive === (theme === 'dark')
            const variant = usesPrimaryVariant ? 'primary-on-brand' : 'secondary-on-brand'

            return item.kind === 'route' ? (
              <Action
                key={item.label}
                to={item.to}
                variant={variant}
                aria-current={isActive ? 'page' : undefined}
                className="shrink-0 text-sm"
              >
                {item.label}
              </Action>
            ) : (
              <Action key={item.label} href={item.href} variant={variant} className="shrink-0 text-sm">
                {item.label}
              </Action>
            )
          })}
        </nav>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
          className="order-1 shrink-0 text-on-brand lg:order-3"
        >
          <Icon name={theme === 'dark' ? 'half-moon' : 'sun-light'} className="h-8 w-8" />
        </button>
      </div>
    </header>
  )
}
