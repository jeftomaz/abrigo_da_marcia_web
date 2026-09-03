import { Icon } from './Icon'
import { useTheme } from '../theme/ThemeProvider'

type ThemeToggleVariant = 'on-brand' | 'surface'

type ThemeToggleProps = {
  variant?: ThemeToggleVariant
}

// O botão não desenha círculo nenhum: o círculo é o `<circle>` de dentro de
// `half-moon.svg`/`sun-light.svg`. Foi a divergência daqui que gerou o defeito — o header
// público dava fundo ao botão (`size-11 rounded-full hover:bg-marca-escura`) sem recolorir o
// ícone, e no hover apareciam dois círculos concêntricos. Fundo aqui, nunca.
const BUTTON_CLASSES =
  'flex shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2'

const BUTTON_VARIANT_CLASSES: Record<ThemeToggleVariant, string> = {
  // 44px de área de toque sem fundo: o alvo de clique do público é preservado, e o que saiu
  // foi só o preenchimento que virava o segundo círculo.
  'on-brand': 'size-11 focus-visible:outline-marca-clara',
  surface: 'focus-visible:outline-cinza-medio',
}

// Os dois ícones traziam `style="fill:..."` inline, e estilo inline vence classe — era por
// isso que o admin precisava de 12 `!important` para recolorir. Com o fill fora do arquivo,
// as classes abaixo bastam. Em compensação, `fill` é herdado em SVG: se um estado deixar de
// declarar círculo E glifo, o ícone vira um borrão de uma cor só. Manter os pares completos.
const ICON_VARIANT_CLASSES: Record<ThemeToggleVariant, string> = {
  'on-brand':
    'size-8 [&_circle]:fill-marca-clara [&_path]:fill-marca hover:[&_circle]:fill-marca-escura hover:[&_path]:fill-marca-clara active:[&_circle]:fill-marca active:[&_path]:fill-marca-clara dark:[&_circle]:fill-marca-escura dark:[&_path]:fill-marca dark:hover:[&_circle]:fill-marca-clara dark:hover:[&_path]:fill-marca dark:active:[&_circle]:fill-marca dark:active:[&_path]:fill-marca-clara',
  surface:
    'size-7 desk:size-10 [&_circle]:fill-cinza-claro [&_path]:fill-cinza-escuro hover:[&_circle]:fill-cinza-medio hover:[&_path]:fill-cinza-claro active:[&_circle]:fill-cinza-escuro active:[&_path]:fill-cinza-claro dark:[&_circle]:fill-cinza-medio dark:[&_path]:fill-cinza-claro dark:hover:[&_circle]:fill-cinza-claro dark:hover:[&_path]:fill-cinza-escuro dark:active:[&_circle]:fill-cinza-escuro dark:active:[&_path]:fill-cinza-claro',
}

export function ThemeToggle({ variant = 'surface' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      className={`${BUTTON_CLASSES} ${BUTTON_VARIANT_CLASSES[variant]}`}
    >
      <Icon
        name={theme === 'dark' ? 'half-moon' : 'sun-light'}
        className={ICON_VARIANT_CLASSES[variant]}
      />
    </button>
  )
}
