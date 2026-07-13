import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon } from './Icon'

type ActionVariant = 'primary' | 'primary-inverted' | 'secondary' | 'secondary-inverted'
type ActionSize = 'compact' | 'default'

type CommonActionProps = {
  children: string
  className?: string
  icon?: string
  iconPosition?: 'start' | 'end'
  size?: ActionSize
  variant?: ActionVariant
}

type ButtonActionProps = CommonActionProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    href?: never
    to?: never
  }

type RouteActionProps = CommonActionProps &
  Omit<LinkProps, 'children' | 'className' | 'to'> & {
    href?: never
    to: LinkProps['to']
  }

type AnchorActionProps = CommonActionProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & {
    href: string
    to?: never
  }

type ActionProps = ButtonActionProps | RouteActionProps | AnchorActionProps

const BASE_CLASSES =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-center font-medium transition-colors'

// Sistema dos mockups "Botão Hover"/"Botão Status" (fonte de verdade): cada variante
// carrega o ciclo completo (rest → hover → clicado/active → foco → desativado) só com
// os 6 tokens da paleta. Como um botão CSS não detecta o fundo, o consumidor escolhe
// pela superfície IMEDIATA (contraste):
//   `primary`   (Padrão)     = coral cheio (marca)       → ação principal em fundo claro/neutro (branco, cinza-claro).
//   `secondary` (Secundário) = pill pálido (marca-clara) → ação secundária em fundo claro, OU qualquer ação sobre fundo coral/marca (onde o coral sumiria).
//   `*-inverted`             = só em fundos escuros-neutros (cinza-medio, cinza-escuro, preto).
// Desativado (opacity-40) só atinge <button>; CTAs <Link>/<a> não desabilitam.
const VARIANT_CLASSES: Record<ActionVariant, string> = {
  primary:
    'bg-marca text-marca-clara hover:bg-marca-escura hover:text-marca-clara active:bg-marca-clara active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40',
  'primary-inverted':
    'bg-marca-clara text-marca hover:bg-marca hover:text-marca-clara active:bg-marca-escura active:text-marca-clara focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  secondary:
    'bg-marca-clara text-marca hover:bg-marca-escura hover:text-marca-clara active:bg-marca active:text-marca-clara focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40',
  'secondary-inverted':
    'bg-marca-escura text-marca-clara hover:bg-marca hover:text-marca-clara active:bg-marca-clara active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
}

const SIZE_CLASSES: Record<ActionSize, string> = {
  compact: 'px-10 py-1 text-base',
  default: 'px-16 py-2',
}

export function Action(props: ActionProps) {
  const {
    children,
    className = '',
    icon,
    iconPosition = 'start',
    size = 'default',
    variant = 'primary',
    ...elementProps
  } = props
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`
  const content = (
    <>
      {icon && iconPosition === 'start' && <Icon name={icon} className="size-5 shrink-0" />}
      <span>{children}</span>
      {icon && iconPosition === 'end' && <Icon name={icon} className="size-5 shrink-0" />}
    </>
  )

  if (props.to !== undefined) {
    const { to, ...linkProps } = elementProps as Omit<LinkProps, 'children' | 'className'>
    return (
      <Link {...linkProps} to={to} className={classes}>
        {content}
      </Link>
    )
  }

  if (props.href !== undefined) {
    const { href, ...anchorProps } = elementProps as Omit<
      AnchorHTMLAttributes<HTMLAnchorElement>,
      'children' | 'className'
    >
    return (
      <a {...anchorProps} href={href} className={classes}>
        {content}
      </a>
    )
  }

  const { type = 'button', ...buttonProps } = elementProps as Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'children' | 'className'
  >
  return (
    <button {...buttonProps} type={type} className={classes}>
      {content}
    </button>
  )
}
