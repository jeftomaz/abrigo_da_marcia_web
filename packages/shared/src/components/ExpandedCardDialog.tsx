import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Action } from './Action'

type ExpandedCardDialogAction = {
  label: string
  href: string
}

type ExpandedCardDialogProps = {
  title: string
  description: string
  images: string[]
  tags?: ReactNode
  primaryAction?: ExpandedCardDialogAction
  onClose: () => void
  variant?: 'adoption' | 'default'
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])'

const DIALOG_CLASSES = {
  adoption:
    'flex max-h-[90vh] w-5/6 max-w-3xl flex-col overflow-hidden rounded-3xl bg-black text-cinza-claro dark:bg-white dark:text-cinza-escuro lg:h-[70vh] lg:w-full lg:flex-row',
  default:
    'flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-black text-cinza-claro dark:bg-white dark:text-cinza-escuro lg:max-h-none lg:flex-row',
}

const GALLERY_CLASSES = {
  adoption:
    'flex h-[min(54vh,400px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-black pt-6 select-none dark:bg-white lg:h-full lg:w-1/2 lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto lg:pt-0',
  default:
    'flex h-[min(54vh,400px)] w-full flex-shrink-0 snap-x snap-mandatory overflow-x-auto overscroll-contain bg-cinza-escuro select-none lg:h-auto lg:max-h-[90vh] lg:w-2/5 lg:flex-col lg:snap-y lg:overflow-x-hidden lg:overflow-y-auto',
}

const IMAGE_CLASSES = {
  adoption:
    'h-full w-5/12 flex-shrink-0 snap-center object-cover lg:h-1/2 lg:w-full',
  default:
    'h-full w-full flex-shrink-0 snap-center object-contain lg:object-cover',
}

const DESCRIPTION_CLASSES = {
  adoption: 'text-justify text-lg leading-normal text-cinza-claro dark:text-cinza-escuro',
  default: 'indent-8 text-justify text-cinza-claro dark:text-cinza-escuro',
}

export function ExpandedCardDialog({
  title,
  description,
  images,
  tags,
  primaryAction,
  onClose,
  variant = 'default',
}: ExpandedCardDialogProps) {
  const dragStart = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusables = dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : []
    focusables[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus()
    }
  }, [onClose])

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
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-cinza-escuro/80"
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={DIALOG_CLASSES[variant]}
          onClick={(event) => event.stopPropagation()}
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
                  : 'flex flex-wrap gap-4'
              }`}
            >
              <Action
                onClick={onClose}
                size={primaryAction ? 'small' : 'default'}
                variant="secondary-adaptive"
                className={primaryAction ? 'w-20 shrink-0' : ''}
              >
                Fechar
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
        </div>
      </div>
    </div>
  )
}
