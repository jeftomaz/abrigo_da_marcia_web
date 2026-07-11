const rawIcons = import.meta.glob('../assets/icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const icons = Object.fromEntries(
  Object.entries(rawIcons).map(([path, svg]) => [
    path.replace('../assets/icons/', '').replace('.svg', ''),
    svg,
  ]),
)

type IconProps = {
  name: string
  className?: string
}

export function Icon({ name, className }: IconProps) {
  const svg = icons[name]
  if (!svg) {
    throw new Error(`Icon "${name}" não existe em packages/shared/src/assets/icons`)
  }

  return (
    <span
      className={`inline-block [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-current ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
