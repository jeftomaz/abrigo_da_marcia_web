type BlobImageProps = {
  src: string
  alt: string
  className?: string
}

// Leve irregularidade no contorno, ecoando os "dedos" da pata do logo (Logo.tsx) em vez de um círculo perfeito.
const BLOB_RADIUS = '48% 52% 45% 55% / 55% 45% 58% 42%'

export function BlobImage({ src, alt, className = '' }: BlobImageProps) {
  return (
    <div
      className={`aspect-square overflow-hidden ${className}`}
      style={{ borderRadius: BLOB_RADIUS }}
    >
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    </div>
  )
}
