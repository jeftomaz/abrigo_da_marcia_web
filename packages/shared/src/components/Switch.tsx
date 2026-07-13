import type { ButtonHTMLAttributes } from 'react'

type SwitchVariant = 'neutra' | 'marca'

type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'onClick' | 'type' | 'role' | 'aria-checked'
> & {
  checked: boolean
  onChange: (checked: boolean) => void
  variant?: SwitchVariant
}

// Segue a lógica do `Action`: o esquema de cor é escolhido pela superfície
// IMEDIATA, não pelo tema (independe de claro/escuro, sem `dark:`). No mockup
// "Switches", as colunas "Padrão" e "Invertido" são idênticas em cada linha — o
// que muda é só a superfície, então a variante nomeia o tipo de superfície:
//   `neutra` → fundos neutros (branco, cinza-*, preto): trilho colorido, knob neutro.
//   `marca`  → fundos de marca (marca-clara, marca, marca-escura): trilho neutro, knob colorido.
// Ligado (checked) → knob à direita; Desligado → à esquerda, nas duas variantes.
const TRACK: Record<SwitchVariant, { on: string; off: string }> = {
  neutra: { on: 'bg-marca', off: 'bg-marca-escura' },
  marca: { on: 'bg-white', off: 'bg-black' },
}
const KNOB: Record<SwitchVariant, { on: string; off: string }> = {
  neutra: { on: 'bg-white', off: 'bg-black' },
  marca: { on: 'bg-marca', off: 'bg-marca-escura' },
}

export function Switch({
  checked,
  onChange,
  variant = 'neutra',
  className = '',
  ...props
}: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${
        checked ? TRACK[variant].on : TRACK[variant].off
      } ${className}`}
    >
      <span
        className={`absolute top-1 size-7 rounded-full transition-all ${
          checked ? `left-8 ${KNOB[variant].on}` : `left-1 ${KNOB[variant].off}`
        }`}
      />
    </button>
  )
}
