import type { ReactNode } from 'react'

type CompactCardOrientation = 'horizontal' | 'vertical'

type CompactCardProps = {
  action?: ReactNode
  className?: string
  description: string
  image: {
    alt: string
    src: string
  }
  orientation?: CompactCardOrientation
  tags?: ReactNode
  title: string
}

const ORIENTATION_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'h-44 flex-row lg:h-56',
  vertical: 'flex-col',
}

const IMAGE_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'h-full w-2/5 flex-shrink-0 object-cover',
  vertical: 'aspect-square w-full object-cover',
}

export function CompactCard({
  action,
  className = '',
  description,
  image,
  orientation = 'vertical',
  tags,
  title,
}: CompactCardProps) {
  return (
    <article
      className={`flex overflow-hidden rounded-2xl bg-black transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 dark:bg-white ${ORIENTATION_CLASSES[orientation]} ${className}`}
    >
      <img src={image.src} alt={image.alt} className={IMAGE_CLASSES[orientation]} />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {tags && <div className="flex flex-wrap gap-1">{tags}</div>}

        <p className="font-medium text-marca">{title}</p>

        <p className="text-sm text-cinza-claro dark:text-cinza-escuro">
          {description}
        </p>

        {action && (
          <div
            className={`mt-auto ${orientation === 'horizontal' ? 'self-end' : '[&>*]:w-full'}`}
          >
            {action}
          </div>
        )}
      </div>
    </article>
  )
}
