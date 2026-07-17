import { Icon } from '@abrigo/shared'

// Controle "Opção 1 | Opção 2" (sheet "Botões Admin"): duas metades coladas de
// um único botão — mesma ação, motivos diferentes. Primeira metade em verde,
// segunda em neutro escuro; divisória sutil e cantos arredondados só por fora.
type ToggleOption = {
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
}

type OptionToggleProps = {
  first: ToggleOption
  second: ToggleOption
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

const HALF_BASE =
  'flex items-center justify-center gap-2 px-5.5 py-3.5 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-marca disabled:pointer-events-none disabled:opacity-40 sm:px-2 sm:text-sm'

function Half({ option, extra }: { option: ToggleOption; extra: string }) {
  return (
    <button type="button" onClick={option.onClick} disabled={option.disabled} className={`${HALF_BASE} ${extra}`}>
      {option.icon && <Icon name={option.icon} className="size-3.5 shrink-0 sm:size-4" />}
      {option.label}
    </button>
  )
}

export function OptionToggle({ first, second, orientation = 'vertical', className = '' }: OptionToggleProps) {
  const isVertical = orientation === 'vertical'
  const divider = isVertical ? 'border-t' : 'border-l'
  return (
    <div
      className={`inline-flex overflow-hidden rounded-xl ${isVertical ? 'flex-col' : 'flex-row'} ${className}`}
    >
      <Half option={first} extra="bg-status-verde text-status-verde-texto hover:bg-status-verde-escura" />
      <Half option={second} extra={`${divider} border-cinza-escuro/20 bg-cinza-medio text-cinza-claro hover:bg-cinza-escuro`} />
    </div>
  )
}
