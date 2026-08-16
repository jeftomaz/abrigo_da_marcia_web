import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon } from './Icon'

type ActionVariant =
  | 'primary'
  | 'primary-adaptive'
  | 'primary-inverted'
  | 'primary-on-brand'
  | 'secondary'
  | 'secondary-adaptive'
  | 'secondary-inverted'
  | 'secondary-on-brand'
  | 'neutral'
  | 'neutral-adaptive'
  | 'neutral-inverted'
type ActionSize =
  | 'admin-inline'
  | 'admin-row'
  | 'admin-row-event'
  | 'compact'
  | 'default'
  | 'medium'
  | 'small'

type CommonActionProps = {
  children: ReactNode
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

// `gap` mora em `SIZE_CLASSES`, não aqui: com os dois no mesmo lugar da folha de estilo,
// o `gap-2` da base vencia o `gap-0.5` do tamanho e obrigava o consumidor ao `!`.
const BASE_CLASSES =
  'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-full text-center font-medium transition-colors'

// Sistema dos mockups "Botão Hover"/"Botão Status" (fonte de verdade): cada variante
// carrega o ciclo completo (rest → hover → clicado/active → foco → desativado) só com
// os 6 tokens da paleta. Como um botão CSS não detecta o fundo, o consumidor escolhe
// pela superfície IMEDIATA (contraste):
//   `primary`   (Padrão)     = coral cheio (marca)       → ação principal em fundo claro/neutro (branco, cinza-claro).
//   `secondary` (Secundário) = pill pálido (marca-clara) → ação secundária em fundo claro.
//   `*-adaptive`             = usa a matriz padrão em superfícies claras e a
//                              invertida em superfícies escuras.
//   `*-on-brand`             = fundo coral/marca.
//   `*-inverted`             = fundos escuros-neutros (cinza-medio, cinza-escuro, preto).
//   `neutral` (Botão)        = versão sóbria, sem cor de marca: pílula clara/texto
//                              escuro, legível sobre qualquer superfície (card branco
//                              ou preto). `neutral-adaptive` acompanha o tema e
//                              `neutral-inverted` é a metade escura (Invertido).
// Desativado (opacity-40) só atinge <button>; CTAs <Link>/<a> não desabilitam.
const VARIANT_CLASSES: Record<ActionVariant, string> = {
  primary:
    'bg-marca text-marca-clara hover:bg-marca-escura hover:text-marca-clara active:bg-marca-clara active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40',
  'primary-adaptive':
    'bg-marca text-marca-clara hover:bg-marca-escura hover:text-marca-clara active:bg-marca-clara active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca dark:bg-marca dark:text-marca-escura dark:hover:bg-marca-clara dark:hover:text-marca dark:active:bg-marca-escura dark:active:text-marca dark:focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  'primary-inverted':
    'bg-marca text-marca-escura hover:bg-marca-clara hover:text-marca active:bg-marca-escura active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  'primary-on-brand':
    'bg-marca-clara text-marca hover:bg-cinza-escuro hover:text-marca active:bg-marca-escura active:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  secondary:
    'bg-marca-clara text-marca hover:bg-marca-escura hover:text-marca-clara active:bg-marca active:text-marca-clara focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40',
  'secondary-adaptive':
    'bg-marca-clara text-marca hover:bg-marca-escura hover:text-marca-clara active:bg-marca active:text-marca-clara focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca dark:bg-marca-escura dark:text-marca dark:hover:bg-marca-clara dark:hover:text-marca dark:active:bg-marca dark:active:text-marca-escura dark:focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  'secondary-inverted':
    'bg-marca-escura text-marca hover:bg-marca-clara hover:text-marca active:bg-marca active:text-marca-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  'secondary-on-brand':
    'bg-marca-escura text-marca hover:bg-cinza-escuro active:bg-marca-clara focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara disabled:pointer-events-none disabled:opacity-40',
  neutral:
    'bg-cinza-claro text-cinza-escuro hover:bg-cinza-medio hover:text-cinza-claro active:bg-cinza-escuro active:text-cinza-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinza-medio disabled:pointer-events-none disabled:opacity-40',
  'neutral-adaptive':
    'bg-cinza-claro text-cinza-escuro hover:bg-cinza-medio hover:text-cinza-claro active:bg-cinza-escuro active:text-cinza-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinza-medio dark:bg-cinza-medio dark:text-cinza-claro dark:hover:bg-cinza-claro dark:hover:text-cinza-escuro dark:active:bg-cinza-escuro dark:active:text-cinza-claro disabled:pointer-events-none disabled:opacity-40',
  'neutral-inverted':
    'bg-cinza-escuro text-cinza-claro hover:bg-cinza-claro hover:text-cinza-escuro active:bg-cinza-medio active:text-cinza-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinza-medio disabled:pointer-events-none disabled:opacity-40',
}

// Padding vem sempre daqui: `className` não sobrepõe estas classes, porque quem decide é a
// ordem na folha de estilo, não a ordem no atributo — `px-16` de `default` vence um `px-7`
// passado por fora. Precisou de outro espaçamento? Adicione um tamanho.
const SIZE_CLASSES: Record<ActionSize, string> = {
  compact: 'gap-2 px-10 py-1 text-base',
  default: 'gap-2 px-16 py-2',
  medium: 'gap-2 px-7 py-3 text-base',
  small: 'gap-2 px-6 py-4 text-sm',
  // Os três abaixo são as ações dentro das linhas do admin, onde a largura é escassa e
  // o espaçamento acompanha o breakpoint. Antes viviam no className do consumidor com
  // a marca de importante, necessária justamente porque className não vence
  // SIZE_CLASSES na folha de estilo — e o resultado era o contrato deste componente
  // sendo furado em quatro arquivos.
  'admin-row': 'gap-0.5 px-1 py-2 text-xs linha:gap-1 linha:px-2 linha:text-sm',
  'admin-row-event':
    'gap-2 px-3 py-2 text-sm acoes:gap-1 acoes:px-2 acoes:text-xs sm:gap-2 sm:px-3 sm:text-sm desk:gap-1.5 desk:px-2 desk:text-sm',
  'admin-inline': 'gap-1 px-2 py-1.5 text-xs',
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
