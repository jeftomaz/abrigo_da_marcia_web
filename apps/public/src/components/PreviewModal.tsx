import { useEffect } from 'react'

type PreviewModalAction = {
  label: string
  href: string
}

type PreviewModalProps = {
  name: string
  description: string
  image: string
  tags?: string[]
  primaryAction?: PreviewModalAction
  onClose: () => void
}

export function PreviewModal({
  name,
  description,
  image,
  tags,
  primaryAction,
  onClose,
}: PreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-cinza-escuro/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white max-h-[90vh] lg:flex-row"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={image}
          alt={name}
          className="h-56 w-full flex-shrink-0 object-cover lg:h-auto lg:w-2/5"
        />

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6 lg:p-10">
          {tags && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full bg-marca-escura px-2 py-0.5 text-tag font-medium text-marca-clara"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h3 className="text-3xl font-medium text-marca lg:text-4xl">{name}</h3>

          <p className="text-cinza-escuro">{description}</p>

          <div
            className={
              primaryAction
                ? 'mt-auto grid grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] gap-4 pt-4'
                : 'mt-auto flex flex-wrap gap-4 pt-4'
            }
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-marca-clara px-6 py-2 text-center font-medium text-marca-escura"
            >
              Fechar
            </button>

            {primaryAction && (
              <a
                href={primaryAction.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-marca px-6 py-2 text-center font-medium text-marca-clara"
              >
                {primaryAction.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
