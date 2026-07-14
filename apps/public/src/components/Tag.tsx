type TagProps = {
  children: string
  size?: 'dialog' | 'sm' | 'md'
  variant?: 'default' | 'dialog'
}

const SIZES = {
  dialog: 'px-3 py-1 text-base',
  sm: 'px-2 py-0.5 text-tag',
  md: 'px-4 py-1 text-xs',
}

const VARIANTS = {
  default: 'bg-marca-escura text-marca-clara',
  dialog: 'bg-marca text-marca-escura dark:bg-marca-escura dark:text-marca-clara',
}

export function Tag({ children, size = 'sm', variant = 'default' }: TagProps) {
  return (
    <span
      className={`rounded font-bold tracking-wide ${SIZES[size]} ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  )
}
