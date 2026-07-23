type BlobImageProps = {
  src: string
  alt: string
  aspect?: 'portrait' | 'square'
  className?: string
  // Imagem acima da dobra (ex.: Hero/LCP): carrega imediatamente com prioridade alta.
  priority?: boolean
}

// Leve irregularidade no contorno, ecoando os "dedos" da pata do logo (Logo.tsx) em vez de um círculo perfeito.
const BLOB_RADIUS = '48% 52% 45% 55% / 55% 45% 58% 42%'

export function BlobImage({
  src,
  alt,
  aspect = 'square',
  className = '',
  priority = false,
}: BlobImageProps) {
  return (
    <div
      className={`${aspect === 'portrait' ? 'aspect-[15/16]' : 'aspect-square'} overflow-hidden ${className}`}
      style={{ borderRadius: BLOB_RADIUS }}
    >
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-full w-full object-cover"
      />
    </div>
  )
}
