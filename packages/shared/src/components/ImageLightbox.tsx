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
      className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] items-center justify-center bg-black p-4"
      onClose={onClose}
      persistentClose
    >
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </Dialog>
  )
}
