import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  Icon,
  ImageLightbox,
  compressImages,
} from '@abrigo/shared'
import type { EditablePhoto } from '@abrigo/shared'

type PhotoGalleryFieldProps = {
  error?: string
  density?: 'default' | 'compact'
  formId: string
  layout: 'modal' | 'panel'
  onProcessingChange: (isProcessing: boolean) => void
  photos: EditablePhoto[]
  setPhotos: Dispatch<SetStateAction<EditablePhoto[]>>
  subjectLabel: string
  title?: string
}

const MAX_PHOTOS = 5

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export function PhotoGalleryField({
  error,
  density = 'default',
  formId,
  layout,
  onProcessingChange,
  photos,
  setPhotos,
  subjectLabel,
  title = 'Imagens',
}: PhotoGalleryFieldProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [expandedPhoto, setExpandedPhoto] = useState<EditablePhoto | null>(null)
  const createdPhotoUrls = useRef(new Set<string>())
  const draggedPhotoKey = useRef<string | null>(null)
  const didDragPhoto = useRef(false)
  const isMounted = useRef(true)
  const isPanel = layout === 'panel'
  const isCompact = !isPanel && density === 'compact'

  useEffect(() => {
    const photoUrls = createdPhotoUrls.current
    isMounted.current = true
    return () => {
      isMounted.current = false
      photoUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const setProcessing = (processing: boolean) => {
    setIsProcessing(processing)
    onProcessingChange(processing)
  }

  const addPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const selectedFiles = Array.from(input.files ?? [])
    const availableSlots = MAX_PHOTOS - photos.length
    input.value = ''
    if (selectedFiles.length === 0 || availableSlots === 0) return

    setProcessing(true)
    setPhotoError('')

    const filesToAdd = selectedFiles.slice(0, availableSlots)
    const pendingPhotos: EditablePhoto[] = filesToAdd.map((file) => {
      const previewUrl = URL.createObjectURL(file)
      createdPhotoUrls.current.add(previewUrl)
      return { key: crypto.randomUUID(), previewUrl, file }
    })
    setPhotos((current) => [...current, ...pendingPhotos])

    try {
      await waitForPaint()
      const compressedFiles = await compressImages(filesToAdd)
      if (!isMounted.current) return
      const compressedByKey = new Map(
        pendingPhotos.map((photo, index) => [photo.key, compressedFiles[index]]),
      )
      setPhotos((current) =>
        current.map((photo) => ({
          ...photo,
          file: compressedByKey.get(photo.key) ?? photo.file,
        })),
      )

      if (selectedFiles.length > availableSlots) {
        setPhotoError(`A galeria aceita no máximo ${MAX_PHOTOS} imagens.`)
      }
    } catch {
      if (isMounted.current) {
        const pendingKeys = new Set(pendingPhotos.map((photo) => photo.key))
        setPhotos((current) => current.filter((photo) => !pendingKeys.has(photo.key)))
        setExpandedPhoto((current) => current && pendingKeys.has(current.key) ? null : current)
        pendingPhotos.forEach((photo) => {
          createdPhotoUrls.current.delete(photo.previewUrl)
          URL.revokeObjectURL(photo.previewUrl)
        })
        setPhotoError('Não foi possível adicionar uma das imagens.')
      }
    } finally {
      if (isMounted.current) setProcessing(false)
    }
  }

  const removePhoto = (photo: EditablePhoto) => {
    if (expandedPhoto?.key === photo.key) setExpandedPhoto(null)
    if (createdPhotoUrls.current.delete(photo.previewUrl)) URL.revokeObjectURL(photo.previewUrl)
    setPhotos((current) => current.filter((item) => item.key !== photo.key))
  }

  const movePhoto = (targetKey: string) => {
    const sourceKey = draggedPhotoKey.current
    if (!sourceKey || sourceKey === targetKey) return
    setPhotos((current) => {
      const sourceIndex = current.findIndex((photo) => photo.key === sourceKey)
      const targetIndex = current.findIndex((photo) => photo.key === targetKey)
      if (sourceIndex < 0 || targetIndex < 0) return current
      const reordered = [...current]
      const [movedPhoto] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, movedPhoto)
      return reordered
    })
  }

  return (
    <section
      id={`${formId}-gallery`}
      tabIndex={-1}
      className={
        isPanel
          ? ''
          : `${isCompact ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-cinza-medio dark:border-cinza-claro`
      }
    >
      <h3
        className={`${isPanel ? 'text-lg' : isCompact ? 'text-xl' : 'text-3xl'} font-medium`}
      >
        {title}
      </h3>
      <p
        className={`${isPanel || isCompact ? 'mt-2' : 'mt-3'} ${isPanel ? 'text-sm' : ''} font-medium`}
      >
        Galeria de Divulgação ({photos.length}/{MAX_PHOTOS})
      </p>
      {photos.length > 1 && (
        <p className="mt-1 text-xs text-cinza-medio dark:text-cinza-claro">
          Arraste para reordenar. A primeira imagem é a capa.
        </p>
      )}
      <div
        className={`mt-2 grid gap-2 ${
          isPanel
            ? 'grid-cols-3'
            : isCompact
              ? 'grid-cols-[repeat(4,3.25rem)]'
              : 'grid-cols-[repeat(4,4rem)]'
        }`}
      >
        {photos.length < MAX_PHOTOS && (
          <label
            htmlFor={`${formId}-photos`}
            aria-label="Adicionar foto"
            aria-disabled={isProcessing}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cinza-medio text-xs font-medium text-cinza-medio dark:border-cinza-claro dark:text-cinza-claro"
          >
            <input
              id={`${formId}-photos`}
              type="file"
              accept={ACCEPTED_UPLOAD_IMAGE_TYPES.join(',')}
              multiple
              disabled={isProcessing}
              onChange={addPhotos}
              className="sr-only"
            />
            <Icon name="plus-circle-solid" className="size-6" />
            Adicionar
          </label>
        )}
        {photos.map((photo, index) => (
          <div
            key={photo.key}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              movePhoto(photo.key)
            }}
            className="relative aspect-square overflow-hidden rounded-xl bg-cinza-claro dark:bg-cinza-medio"
          >
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="pata" className="size-8 text-cinza-medio dark:text-cinza-claro" />
            </div>
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                draggedPhotoKey.current = photo.key
                didDragPhoto.current = true
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', photo.key)
              }}
              onDragEnd={() => {
                draggedPhotoKey.current = null
                window.setTimeout(() => {
                  didDragPhoto.current = false
                }, 0)
              }}
              onClick={() => {
                if (!didDragPhoto.current) setExpandedPhoto(photo)
              }}
              aria-label={`Ampliar foto ${index + 1} de ${subjectLabel}`}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              <img
                src={photo.previewUrl}
                alt=""
                draggable={false}
                className="h-full w-full object-cover"
              />
            </button>
            {index === 0 && (
              <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-cinza-escuro/80 px-2 py-0.5 text-[0.625rem] font-medium text-cinza-claro">
                Capa
              </span>
            )}
            <button
              type="button"
              onClick={() => removePhoto(photo)}
              aria-label={`Remover foto ${index + 1}`}
              className="absolute top-1 right-1 rounded-full bg-cinza-escuro/70 p-1 text-cinza-claro"
            >
              <Icon name="xmark-circle-solid" className="size-4" />
            </button>
          </div>
        ))}
      </div>
      {isProcessing && (
        <p role="status" className="mt-2 text-sm font-medium">
          Processando imagens...
        </p>
      )}
      {(photoError || error) && (
        <p role="alert" className="mt-2 text-sm font-medium text-marca-escura dark:text-marca">
          {photoError || error}
        </p>
      )}
      {expandedPhoto && (
        <ImageLightbox
          src={expandedPhoto.previewUrl}
          alt={`Foto ampliada de ${subjectLabel}`}
          onClose={() => setExpandedPhoto(null)}
        />
      )}
    </section>
  )
}
