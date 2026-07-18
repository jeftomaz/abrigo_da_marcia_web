import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Action } from './Action'

type DialogProps = {
  active?: boolean
  ariaLabel?: string
  ariaLabelledBy?: string
  children: ReactNode
  className?: string
  onClose: () => void
  persistentClose?: boolean
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

let openDialogCount = 0
let previousBodyOverflow = ''
const activeDialogs: symbol[] = []

export function Dialog({
  active = true,
  ariaLabel,
  ariaLabelledBy,
  children,
  className = '',
  onClose,
  persistentClose = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const dialogId = useRef(Symbol('dialog'))
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (openDialogCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    openDialogCount += 1

    return () => {
      openDialogCount -= 1
      if (openDialogCount === 0) document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  useEffect(() => {
    if (!active) return

    const id = dialogId.current
    activeDialogs.push(id)
    const previouslyFocused = document.activeElement as HTMLElement | null
    const getFocusables = () =>
      dialogRef.current
        ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        : []

    getFocusables()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeDialogs[activeDialogs.length - 1] !== id) return
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }

      const focusables = getFocusables()
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

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const index = activeDialogs.lastIndexOf(id)
      if (index >= 0) activeDialogs.splice(index, 1)
      previouslyFocused?.focus()
    }
  }, [active])

  return (
    <div
      inert={!active}
      className={`fixed inset-0 z-50 overflow-y-auto bg-cinza-escuro/80 ${active ? '' : 'pointer-events-none'}`}
      onClick={active ? onClose : undefined}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className={`relative ${className}`}
          onClick={(event) => event.stopPropagation()}
        >
          {persistentClose && (
            <Action
              onClick={onClose}
              icon="xmark-circle-solid"
              size="small"
              className="absolute top-3 right-3 z-20 shadow-md"
              aria-label="Fechar"
            >
              Fechar
            </Action>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
