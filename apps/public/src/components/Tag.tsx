type TagProps = {
  children: string
  size?: 'sm' | 'md'
}

const SIZES = {
  sm: 'px-2 py-0.5 text-tag',
  md: 'px-4 py-1 text-xs',
}

export function Tag({ children, size = 'sm' }: TagProps) {
  return (
    <span
      className={`rounded bg-marca-escura font-bold tracking-wide text-marca-clara ${SIZES[size]}`}
    >
      {children}
    </span>
  )
}
