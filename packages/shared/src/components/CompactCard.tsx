import type { ReactNode } from 'react'

type CompactCardOrientation = 'horizontal' | 'vertical'
type CompactCardImageAspect = 'landscape' | 'square'

type CompactCardProps = {
  action?: ReactNode
  actionArea?: 'button' | 'card'
  className?: string
  description: string
  image: {
    alt: string
    src: string
  }
  imageAspect?: CompactCardImageAspect
  orientation?: CompactCardOrientation
  tags?: ReactNode
  title: string
}

const ORIENTATION_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'h-44 flex-row lg:h-56',
  vertical: 'flex-col',
}

const IMAGE_ORIENTATION_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'h-full w-2/5 flex-shrink-0 object-cover',
  vertical: 'w-full object-cover',
}

const IMAGE_ASPECT_CLASSES: Record<CompactCardImageAspect, string> = {
  landscape: 'aspect-4/3',
  square: 'aspect-square',
}

export function CompactCard({
  action,
  actionArea = 'button',
  className = '',
  description,
  image,
  imageAspect = 'square',
  orientation = 'vertical',
  tags,
  title,
}: CompactCardProps) {
  return (
    <article
      className={`flex overflow-hidden rounded-2xl bg-surface-raised text-on-surface-raised transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 ${actionArea === 'card' ? 'relative' : ''} ${ORIENTATION_CLASSES[orientation]} ${className}`}
    >
      <img
        src={image.src}
        alt={image.alt}
        className={`${IMAGE_ORIENTATION_CLASSES[orientation]} ${orientation === 'vertical' ? IMAGE_ASPECT_CLASSES[imageAspect] : ''}`}
      />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {tags && <div className="flex flex-wrap gap-1">{tags}</div>}

        <p className="font-medium text-marca">{title}</p>

        <p className="line-clamp-3 text-sm">
          {description}
        </p>

        {action && (
          <div
            className={`mt-auto ${orientation === 'horizontal' ? 'self-end' : '[&>*]:w-full'} ${actionArea === 'card' ? "[&>*]:after:absolute [&>*]:after:inset-0 [&>*]:after:content-['']" : ''}`}
          >
            {action}
          </div>
        )}
      </div>
    </article>
  )
}
