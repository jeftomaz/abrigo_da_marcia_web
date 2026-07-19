import { Action } from './Action'
import { Dialog } from './Dialog'

type ImageLightboxProps = {
  alt: string
  onClose: () => void
  src: string
}

export function ImageLightbox({ alt, onClose, src }: ImageLightboxProps) {
  return (
    <Dialog
      ariaLabel={`Imagem ampliada: ${alt}`}
      onClose={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col items-center gap-4"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-2rem)] object-contain"
          onClick={(event) => event.stopPropagation()}
        />
        <Action
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          size="small"
          variant="neutral"
        >
          Fechar imagem
        </Action>
      </div>
    </Dialog>
  )
}
