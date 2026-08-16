export const MAX_UPLOAD_IMAGE_BYTES = 500_000

export const ACCEPTED_UPLOAD_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

// A verba de 500 KB se gasta em resolução OU em qualidade, e quem decide é a ordem das
// tentativas. Gastá-la em pixels demais deixa poucos bits para cada um: 2560px consome
// a verba inteira a 0,81 bit/pixel, abaixo do 1,5-2 que o WebP precisa para não blocar.
// A 1600px a mesma verba rende 2,1 bpp — e 1600px já cobre a maior superfície de
// exibição, o ImageLightbox, que é limitado pelo viewport.
const MAX_IMAGE_SIDE = 1600
const MIN_IMAGE_SIDE = 320
// Acima deste piso a foto ainda parece foto. Reduzir resolução é preferível a cruzá-lo.
const PREFERRED_QUALITY_STEPS = [0.85, 0.72, 0.6]
// Só na menor resolução possível: aqui a imagem já é pequena e a perda é menos visível.
const LAST_RESORT_QUALITY_STEPS = [0.48, 0.36, 0.24]
const SCALE_STEP = 0.75

type OutputFormat = 'image/webp' | 'image/jpeg'

const FILE_EXTENSIONS: Record<OutputFormat, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
}

function toBlob(canvas: HTMLCanvasElement, format: OutputFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Não foi possível comprimir a imagem.'))
      },
      format,
      quality,
    )
  })
}

// O Safari ignora o formato pedido em `toBlob` e devolve PNG — sem erro, sem aviso.
// PNG de foto é lossless, então a imagem não cabia na verba por qualidade e o algoritmo
// a encolhia até caber: uma foto de 3024x4032 virava 380x506, visivelmente pixelizada.
// Detectamos uma vez o que o navegador realmente produz e caímos em JPEG quando WebP
// não sai — JPEG respeita o parâmetro de qualidade e existe em todo lugar.
let detectedFormat: Promise<OutputFormat> | null = null

function outputFormat() {
  detectedFormat ??= (async () => {
    const probe = document.createElement('canvas')
    probe.width = 1
    probe.height = 1
    const blob = await new Promise<Blob | null>((resolve) => {
      probe.toBlob(resolve, 'image/webp', 0.8)
    })
    return blob?.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
  })()
  return detectedFormat
}

function compressedFileName(name: string, format: OutputFormat) {
  const baseName = name.replace(/\.[^/.]+$/, '') || 'imagem'
  return `${baseName}.${FILE_EXTENSIONS[format]}`
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

  const format = await outputFormat()
  const largestSide = Math.max(image.width, image.height)
  const initialScale = Math.min(1, MAX_IMAGE_SIDE / largestSide)
  let width = Math.max(1, Math.round(image.width * initialScale))
  let height = Math.max(1, Math.round(image.height * initialScale))

  const tentarQualidades = async (qualities: number[]) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a compressão da imagem.')
    // JPEG não tem canal alfa: sem o fundo branco, área transparente de PNG viraria preta.
    if (format === 'image/jpeg') {
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(image, 0, 0, width, height)

    for (const quality of qualities) {
      const blob = await toBlob(canvas, format, quality)
      if (blob.size <= MAX_UPLOAD_IMAGE_BYTES) return blob
    }
    return null
  }

  try {
    // Encolhe a imagem enquanto ela não couber na verba sem cruzar o piso de qualidade.
    let blob: Blob | null = null
    while (true) {
      blob = await tentarQualidades(PREFERRED_QUALITY_STEPS)
      if (blob || Math.max(width, height) <= MIN_IMAGE_SIDE) break
      width = Math.max(1, Math.round(width * SCALE_STEP))
      height = Math.max(1, Math.round(height * SCALE_STEP))
    }

    // Chegou ao menor tamanho e ainda não coube: só então vale sacrificar qualidade.
    if (!blob) blob = await tentarQualidades(LAST_RESORT_QUALITY_STEPS)
    if (!blob) throw new Error(`Não foi possível reduzir "${file.name}" para 500 KB.`)

    return new File([blob], compressedFileName(file.name, format), {
      type: blob.type,
      lastModified: file.lastModified,
    })
  } finally {
    image.close()
  }
}

export async function compressImages(files: File[]) {
  const compressed: File[] = []
  for (const file of files) compressed.push(await compressImage(file))
  return compressed
}
