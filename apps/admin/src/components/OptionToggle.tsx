import { Icon } from '@abrigo/shared'

// Controle "Opção 1 | Opção 2" (sheet "Botões Admin"): duas metades coladas de
// um único botão — mesma ação, motivos diferentes. Primeira metade em verde,
// segunda em neutro escuro; divisória sutil e cantos arredondados só por fora.
type ToggleOption = {
  label: string
  icon?: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
}

type OptionToggleProps = {
  first: ToggleOption
  second: ToggleOption
  orientation?: 'vertical' | 'horizontal'
  size?: 'default' | 'compact'
  className?: string
}

const HALF_BASE =
  'flex flex-1 items-center justify-center gap-2 font-medium transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40'
const HALF_SIZE = {
  default: 'px-5.5 py-3.5 text-xs sm:px-2 sm:text-sm',
  compact: 'min-h-11 px-2 py-2 text-xs desk:text-sm',
}

function Half({
  option,
  size,
  extra,
}: {
  option: ToggleOption
  size: keyof typeof HALF_SIZE
  extra: string
}) {
  return (
    <button
      type="button"
      onClick={option.onClick}
      aria-pressed={option.active}
      disabled={option.disabled}
      className={`${HALF_BASE} ${HALF_SIZE[size]} ${option.active ? 'z-10 font-semibold shadow-status-active' : ''} ${extra}`}
    >
      {option.icon && <Icon name={option.icon} className="size-3.5 shrink-0 sm:size-4" />}
      {option.label}
    </button>
  )
}

export function OptionToggle({
  first,
  second,
  orientation = 'vertical',
  size = 'default',
  className = '',
}: OptionToggleProps) {
  const isVertical = orientation === 'vertical'
  const divider = isVertical ? 'border-t' : 'border-l'
  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl ${isVertical ? 'flex-col' : 'flex-row'} ${className}`}
    >
      <Half
        option={first}
        size={size}
        extra="bg-status-verde text-status-verde-texto hover:bg-status-verde-escura"
      />
      <Half
        option={second}
        size={size}
        extra={`${divider} border-cinza-escuro/20 bg-cinza-medio text-cinza-claro hover:bg-cinza-escuro`}
      />
    </div>
  )
}
