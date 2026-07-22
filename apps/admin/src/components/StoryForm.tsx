import { useId, useState } from 'react'
import { Action, toEditableStoryPhotos } from '@abrigo/shared'
import type { Story, StoryDraft } from '@abrigo/shared'
import { PhotoGalleryField } from './PhotoGalleryField'

type StoryFormProps = {
  layout: 'modal' | 'panel'
  onCancel: () => void
  onSave: (story: StoryDraft) => Promise<void>
  story: Story | null
  title: string
}

const MAX_NAME_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 1000

export function StoryForm({ layout, onCancel, onSave, story, title }: StoryFormProps) {
  const formId = useId()
  const [name, setName] = useState(story?.name ?? '')
  const [description, setDescription] = useState(story?.description ?? '')
  const [photos, setPhotos] = useState(() => toEditableStoryPhotos(story))
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ description?: string; name?: string }>({})
  const isPanel = layout === 'panel'
  const fieldClasses = `${
    isPanel ? 'h-8 px-3 text-sm' : 'h-10 px-4'
  } mt-1 w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const labelClasses = `${isPanel ? 'mt-2 text-sm' : 'mt-3'} block font-medium`

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedDescription = description.trim()
    const errors = {
      ...(!normalizedName ? { name: 'Informe o nome da história.' } : {}),
      ...(!normalizedDescription ? { description: 'Conte a história antes de salvar.' } : {}),
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    if (photos.length === 0) {
      setSaveError('Adicione ao menos uma imagem.')
      return
    }

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        id: story?.id,
        name: normalizedName,
        description: normalizedDescription,
        photos,
        published: story?.published ?? false,
      })
    } catch {
      setSaveError('Não foi possível salvar a história.')
    } finally {
      setIsSaving(false)
    }
  }

  const dadosSection = (
    <section>
      <h3 className={`${isPanel ? 'text-lg' : 'text-xl'} font-medium`}>Dados</h3>
      <label htmlFor={`${formId}-name`} className={labelClasses}>
        Nome*
      </label>
      <input
        id={`${formId}-name`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Ex: Doguinho"
        maxLength={MAX_NAME_LENGTH}
        required
        aria-invalid={Boolean(fieldErrors.name)}
        aria-describedby={fieldErrors.name ? `${formId}-name-error` : undefined}
        className={fieldClasses}
      />
      {fieldErrors.name && <p id={`${formId}-name-error`} role="alert" className="mt-1 text-xs font-medium text-marca">{fieldErrors.name}</p>}

      <div className={`${isPanel ? 'mt-2 text-sm' : 'mt-3'} flex items-center justify-between gap-2`}>
        <label htmlFor={`${formId}-description`} className="font-medium">
          História*
        </label>
        <output
          id={`${formId}-description-count`}
          htmlFor={`${formId}-description`}
          className="text-xs text-cinza-medio dark:text-cinza-claro"
        >
          {description.length}/{MAX_DESCRIPTION_LENGTH}
        </output>
      </div>
      <textarea
        id={`${formId}-description`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Conte a trajetória do cão até o novo lar."
        maxLength={MAX_DESCRIPTION_LENGTH}
        aria-invalid={Boolean(fieldErrors.description)}
        aria-describedby={`${formId}-description-count${fieldErrors.description ? ` ${formId}-description-error` : ''}`}
        rows={isPanel ? 4 : 5}
        required
        className={`mt-1 w-full resize-y rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50 ${isPanel ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}
      />
      {fieldErrors.description && <p id={`${formId}-description-error`} role="alert" className="mt-1 text-xs font-medium text-marca">{fieldErrors.description}</p>}
    </section>
  )

  const imagensSection = (
    <PhotoGalleryField
      error={saveError}
      formId={formId}
      layout={layout}
      onProcessingChange={setIsCompressing}
      photos={photos}
      setPhotos={setPhotos}
      subjectLabel={story?.name || name || 'história'}
    />
  )

  const buttonsRow = (
    <div className={`${isPanel ? 'mt-4 gap-3' : 'mt-4 gap-4'} flex`}>
      <Action
        onClick={onCancel}
        size="small"
        variant="secondary-adaptive"
        className={`${isPanel ? 'w-20' : 'w-28'} shrink-0`}
      >
        Cancelar
      </Action>
      <Action
        type="submit"
        size="small"
        variant="primary-adaptive"
        disabled={isCompressing || isSaving}
        className="min-w-0 flex-1"
      >
        {isSaving ? 'Salvando...' : 'Salvar História'}
      </Action>
    </div>
  )

  if (layout === 'panel') {
    return (
      <form onSubmit={handleSubmit} className="grid items-start gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div>
          <h2 className="text-3xl font-medium text-marca">{title}</h2>
          <div className="mt-4">{imagensSection}</div>
        </div>
        <div>
          {dadosSection}
          {buttonsRow}
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <h2 className="text-3xl font-medium text-marca">{title}</h2>
      <div className="mt-5">{dadosSection}</div>
      {imagensSection}
      {buttonsRow}
    </form>
  )
}
