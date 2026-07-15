import type { ReactNode } from 'react'

type CompactCardOrientation = 'horizontal' | 'responsive' | 'vertical'
type CompactCardImageAspect = 'landscape' | 'square'

type CompactCardProps = {
  action?: ReactNode
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
  responsive: 'flex-col lg:h-56 lg:flex-row',
  vertical: 'flex-col',
}

const IMAGE_ORIENTATION_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'h-full w-2/5 flex-shrink-0 object-cover',
  responsive: 'w-full flex-shrink-0 object-cover lg:h-full lg:w-2/5',
  vertical: 'w-full object-cover',
}

const ACTION_ORIENTATION_CLASSES: Record<CompactCardOrientation, string> = {
  horizontal: 'self-end',
  responsive: '[&>*]:w-full lg:self-end lg:[&>*]:w-auto',
  vertical: '[&>*]:w-full',
}

const IMAGE_ASPECT_CLASSES: Record<CompactCardImageAspect, string> = {
  landscape: 'aspect-4/3',
  square: 'aspect-square',
}

export function CompactCard({
  action,
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
      className={`relative flex overflow-hidden rounded-2xl bg-surface-raised text-on-surface-raised transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 ${ORIENTATION_CLASSES[orientation]} ${className}`}
    >
      <img
        src={image.src}
        alt={image.alt}
        className={`${IMAGE_ORIENTATION_CLASSES[orientation]} ${orientation !== 'horizontal' ? IMAGE_ASPECT_CLASSES[imageAspect] : ''} ${orientation === 'responsive' ? 'lg:aspect-auto' : ''}`}
      />

      <div className="flex flex-1 flex-col gap-2 p-3">
        {tags && <div className="flex flex-wrap gap-1">{tags}</div>}

        <p className="font-medium text-marca">{title}</p>

        <p className="line-clamp-3 text-sm">
          {description}
        </p>

        {action && (
          <div
            className={`mt-auto ${ACTION_ORIENTATION_CLASSES[orientation]} [&>*]:after:absolute [&>*]:after:inset-0 [&>*]:after:content-['']`}
          >
            {action}
          </div>
        )}
      </div>
    </article>
  )
}
