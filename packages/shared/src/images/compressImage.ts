export const MAX_UPLOAD_IMAGE_BYTES = 500_000

export const ACCEPTED_UPLOAD_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const MAX_IMAGE_SIDE = 2560
const MIN_IMAGE_SIDE = 320
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.48, 0.36, 0.24]
const SCALE_STEP = 0.75

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível comprimir a imagem.'))
      },
      'image/webp',
      quality,
    )
  })
}

function compressedFileName(name: string) {
  const baseName = name.replace(/\.[^/.]+$/, '') || 'imagem'
  return `${baseName}.webp`
}

// Reencoda mesmo o arquivo já dentro do limite: o canvas descarta EXIF/GPS/XMP por
// construção, e o bucket é público — devolver o original vazaria a localização de quem fotografou.
export async function compressImage(file: File): Promise<File> {
  if (!ACCEPTED_UPLOAD_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_UPLOAD_IMAGE_TYPES)[number])) {
    throw new Error(`O arquivo "${file.name}" deve ser JPG, PNG ou WebP.`)
  }

  let image: ImageBitmap
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`Não foi possível ler a imagem "${file.name}".`)
  }

  const largestSide = Math.max(image.width, image.height)
  const initialScale = Math.min(1, MAX_IMAGE_SIDE / largestSide)
  let width = Math.max(1, Math.round(image.width * initialScale))
  let height = Math.max(1, Math.round(image.height * initialScale))

  try {
    while (true) {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível preparar a compressão da imagem.')
      context.drawImage(image, 0, 0, width, height)

      for (const quality of QUALITY_STEPS) {
        const blob = await canvasToBlob(canvas, quality)
        if (blob.size <= MAX_UPLOAD_IMAGE_BYTES) {
          return new File([blob], compressedFileName(file.name), {
            type: blob.type,
            lastModified: file.lastModified,
          })
        }
      }

      if (Math.max(width, height) <= MIN_IMAGE_SIDE) break
      width = Math.max(1, Math.round(width * SCALE_STEP))
      height = Math.max(1, Math.round(height * SCALE_STEP))
    }
  } finally {
    image.close()
  }

  throw new Error(`Não foi possível reduzir "${file.name}" para 500 KB.`)
}

export async function compressImages(files: File[]) {
  const compressed: File[] = []
  for (const file of files) compressed.push(await compressImage(file))
  return compressed
}
