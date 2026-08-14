import type { ReactNode } from 'react'
import { ImagePlaceholder } from './ImagePlaceholder'

type CompactCardOrientation = 'horizontal' | 'responsive' | 'vertical'
type CompactCardImageAspect = 'landscape' | 'square'

type CompactCardProps = {
  action?: ReactNode
  className?: string
  description: string
  image?: {
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

// No mobile o card vertical divide pouca largura com o vizinho: a imagem fica baixa
// para sobrar altura às tags, ao título e à descrição; no desktop volta a proporção declarada.
const VERTICAL_IMAGE_ASPECT_CLASSES: Record<CompactCardImageAspect, string> = {
  landscape: 'aspect-3/2 lg:aspect-4/3',
  square: 'aspect-3/2 lg:aspect-square',
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
  const imageClassName = [
    IMAGE_ORIENTATION_CLASSES[orientation],
    orientation === 'vertical' ? VERTICAL_IMAGE_ASPECT_CLASSES[imageAspect] : '',
    orientation === 'responsive' ? `${IMAGE_ASPECT_CLASSES[imageAspect]} lg:aspect-auto` : '',
  ].join(' ')

  return (
    <article
      className={`relative flex overflow-hidden rounded-2xl bg-surface-raised text-on-surface-raised transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 ${ORIENTATION_CLASSES[orientation]} ${className}`}
    >
      {image ? (
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
          className={imageClassName}
        />
      ) : (
        <ImagePlaceholder
          label={`Sem foto de ${title}`}
          className={imageClassName}
        />
      )}

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
