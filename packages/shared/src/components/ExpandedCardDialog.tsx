import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Action } from './Action'
import { Dialog } from './Dialog'
import { ImageLightbox } from './ImageLightbox'
import { ImagePlaceholder } from './ImagePlaceholder'

type ExpandedCardDialogAction = {
  label: string
  href: string
}

type ExpandedCardDialogProps = {
  active?: boolean
  children?: ReactNode
  title: string
  description: string
  images: string[]
  expandableImages?: boolean
  tags?: ReactNode
  primaryAction?: ExpandedCardDialogAction
  onClose: () => void
  persistentClose?: boolean
  variant?: 'adoption' | 'default' | 'product' | 'story'
}

const DIALOG_CLASSES = {
  adoption:
    'flex max-h-[90vh] w-5/6 max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised lg:h-[70vh] lg:w-full lg:max-w-4xl lg:flex-row',
  default:
    'flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised lg:max-h-none lg:flex-row',
  product:
    'flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised lg:flex-row',
  story:
    'flex max-h-[90vh] w-5/6 max-w-3xl flex-col overflow-hidden rounded-3xl bg-surface-raised text-on-surface-raised lg:h-[60vh] lg:w-full lg:flex-row',
}

const GALLERY_CLASSES = {
  adoption:
    'flex h-[min(54vh,400px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-surface-raised pt-6 select-none lg:h-full lg:w-1/2 lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto lg:pt-0',
  default:
    'flex h-[min(54vh,400px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-cinza-escuro select-none lg:h-auto lg:max-h-[90vh] lg:w-2/5 lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto',
  product:
    'flex h-[min(33vh,280px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-surface-raised pt-16 select-none lg:h-full lg:w-[30%] lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto lg:pt-0',
  story:
    'flex h-[min(40vh,320px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-surface-raised pt-6 select-none lg:h-full lg:w-1/3 lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto lg:pt-0',
}

const IMAGE_CLASSES = {
  adoption:
    'h-full w-5/12 flex-shrink-0 snap-center object-cover lg:h-1/2 lg:w-full',
  default:
    'h-full w-full flex-shrink-0 snap-center object-contain lg:object-cover',
  product:
    'h-full w-full flex-shrink-0 snap-start object-cover lg:h-auto lg:snap-start',
  story:
    'h-full w-5/12 flex-shrink-0 snap-center object-cover lg:h-1/2 lg:w-full',
}

const EXPANDED_IMAGE_CLASSES = {
  adoption: 'h-full w-full object-cover',
  default: 'h-full w-full object-contain lg:object-cover',
  product: 'h-full w-full object-cover',
  story: 'h-full w-full object-cover',
}

const DESCRIPTION_CLASSES = {
  adoption: 'text-justify text-lg leading-normal',
  default: 'indent-8 text-justify',
  product: 'text-justify',
  story: 'text-justify text-base leading-normal',
}

export function ExpandedCardDialog({
  active,
  children,
  title,
  description,
  images,
  expandableImages = false,
  tags,
  primaryAction,
  onClose,
  persistentClose = false,
  variant = 'default',
}: ExpandedCardDialogProps) {
  const dragStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const didDrag = useRef(false)
  const [expandedImage, setExpandedImage] = useState<{ alt: string; src: string } | null>(null)
  const titleId = useId()

  // overflow-auto só recebe drag nativo em touch/trackpad; mouse precisa desse handler manual
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const container = event.currentTarget
    didDrag.current = false
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const container = event.currentTarget
    if (
      Math.abs(event.clientX - dragStart.current.x) > 4 ||
      Math.abs(event.clientY - dragStart.current.y) > 4
    ) {
      didDrag.current = true
      if (!container.hasPointerCapture(event.pointerId)) {
        container.setPointerCapture(event.pointerId)
      }
    }
    container.scrollLeft = dragStart.current.scrollLeft - (event.clientX - dragStart.current.x)
    container.scrollTop = dragStart.current.scrollTop - (event.clientY - dragStart.current.y)
  }

  const handlePointerUp = () => {
    dragStart.current = null
  }

  const isCarousel = images.length > 1
  const imageClasses = variant === 'adoption' && !isCarousel
    ? 'h-full w-full flex-shrink-0 object-cover'
    : IMAGE_CLASSES[variant]

  return (
    <Dialog
      active={active}
      ariaLabel={children ? title : undefined}
      ariaLabelledBy={children ? undefined : titleId}
      className={DIALOG_CLASSES[variant]}
      onClose={onClose}
      persistentClose={persistentClose}
    >
      <div
        className={`${GALLERY_CLASSES[variant]} ${isCarousel ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {images.length ? (
          images.map((src, index) => (
            expandableImages ? (
              <button
                key={`${src}-${index}`}
                type="button"
                aria-label={`Ampliar ${title} - foto ${index + 1}`}
                className={`${imageClasses} cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-marca`}
                onClick={() => {
                  if (didDrag.current) {
                    didDrag.current = false
                    return
                  }
                  setExpandedImage({ src, alt: `${title} - foto ${index + 1}` })
                }}
              >
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className={EXPANDED_IMAGE_CLASSES[variant]}
                />
              </button>
            ) : (
              <img
                key={`${src}-${index}`}
                src={src}
                alt={`${title} - foto ${index + 1}`}
                draggable={false}
                className={imageClasses}
              />
            )
          ))
        ) : (
          <ImagePlaceholder
            label={`Sem foto de ${title}`}
            className="h-full w-full flex-shrink-0"
          />
        )}
      </div>

      {children ?? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6 pb-0 lg:p-10 lg:pb-0">
            {tags && <div className="flex flex-wrap gap-2">{tags}</div>}

            <h3 id={titleId} className="text-3xl font-medium text-marca lg:text-4xl">
              {title}
            </h3>

            <p className={DESCRIPTION_CLASSES[variant]}>{description}</p>
          </div>

          <div
            className={`flex-shrink-0 p-6 pt-4 lg:p-10 lg:pt-4 ${
              primaryAction
                ? 'flex items-center justify-between gap-4'
                : variant === 'story'
                  ? 'flex justify-center'
                  : 'flex flex-wrap gap-4'
            }`}
          >
            <Action
              onClick={onClose}
              size={primaryAction || variant === 'story' ? 'small' : 'default'}
              variant={variant === 'story' ? 'primary' : 'secondary-adaptive'}
              className={
                primaryAction
                  ? 'w-20 shrink-0'
                  : variant === 'story'
                    ? 'w-40'
                    : ''
              }
            >
              {variant === 'story' ? 'Fechar essa história' : 'Fechar'}
            </Action>

            {primaryAction && (
              <Action
                href={primaryAction.href}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                className="min-w-0 flex-1 sm:w-40 sm:flex-none"
              >
                {primaryAction.label}
              </Action>
            )}
          </div>
        </div>
      )}
      {expandedImage && (
        <ImageLightbox
          src={expandedImage.src}
          alt={expandedImage.alt}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </Dialog>
  )
}
