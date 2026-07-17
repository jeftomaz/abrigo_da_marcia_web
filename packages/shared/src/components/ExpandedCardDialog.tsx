import { useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Action } from './Action'
import { Dialog } from './Dialog'

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
  tags,
  primaryAction,
  onClose,
  persistentClose = false,
  variant = 'default',
}: ExpandedCardDialogProps) {
  const dragStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const titleId = useId()

  // overflow-auto só recebe drag nativo em touch/trackpad; mouse precisa desse handler manual
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const container = event.currentTarget
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
    container.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const container = event.currentTarget
    container.scrollLeft = dragStart.current.scrollLeft - (event.clientX - dragStart.current.x)
    container.scrollTop = dragStart.current.scrollTop - (event.clientY - dragStart.current.y)
  }

  const handlePointerUp = () => {
    dragStart.current = null
  }

  const isCarousel = images.length > 1

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
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`${title} - foto ${index + 1}`}
            draggable={false}
            className={IMAGE_CLASSES[variant]}
          />
        ))}
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
    </Dialog>
  )
}
