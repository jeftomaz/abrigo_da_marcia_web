import { Logo } from './Logo'

type ImagePlaceholderProps = {
  label: string
  className?: string
}

export function ImagePlaceholder({
  label,
  className = '',
}: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center bg-marca text-marca-clara ${className}`}
    >
      <Logo variant="icon" className="h-1/2 w-1/2" />
    </div>
  )
}
