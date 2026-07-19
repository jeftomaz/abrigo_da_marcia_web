import { useId, useState } from 'react'
import {
  Action,
  DEFAULT_ADOPTION_FORM_URL,
  Icon,
  Switch,
  toEditableDogPhotos,
} from '@abrigo/shared'
import type {
  Dog,
  DogDraft,
  DogGender,
  DogSize,
} from '@abrigo/shared'
import { PhotoGalleryField } from './PhotoGalleryField'

type DogFormProps = {
  dog: Dog | null
  layout: 'modal' | 'panel'
  title: string
  onCancel: () => void
  onSave: (dog: DogDraft) => Promise<void>
}

const MAX_NAME_LENGTH = 40
const MAX_DESCRIPTION_LENGTH = 1000
const CURRENT_YEAR = new Date().getFullYear()
const MIN_BIRTH_YEAR = 1990
const MAX_APPROX_AGE = CURRENT_YEAR - MIN_BIRTH_YEAR

function parseBoundedInteger(value: string, min: number, max: number) {
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max ? number : null
}

export function DogForm({ dog, layout, title, onCancel, onSave }: DogFormProps) {
  const formId = useId()
  const [name, setName] = useState(dog?.name ?? '')
  const [gender, setGender] = useState<DogGender | ''>(dog?.gender ?? '')
  const [size, setSize] = useState<DogSize | ''>(dog?.size ?? '')
  const [birthYear, setBirthYear] = useState(dog?.birthYear?.toString() ?? '')
  const [approxAge, setApproxAge] = useState(
    dog?.birthYear ? (CURRENT_YEAR - dog.birthYear).toString() : '',
  )
  const [description, setDescription] = useState(dog?.description ?? '')
  const [adoptionFormUrl, setAdoptionFormUrl] = useState(dog?.adoptionFormUrl ?? DEFAULT_ADOPTION_FORM_URL)
  const [featured, setFeatured] = useState(dog?.featured ?? false)
  const [photos, setPhotos] = useState(() => toEditableDogPhotos(dog))
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `${
    isPanel ? 'h-8 px-3 text-sm' : 'h-10 px-4'
  } mt-1 w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const selectClasses = `${
    isPanel
      ? 'bg-marca-clara text-marca dark:bg-marca-escura dark:text-marca'
      : 'bg-cinza-claro text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro'
  } mt-1 w-full appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marca ${
    isPanel ? 'h-8 px-3 pr-8 text-sm' : 'h-10 px-5 pr-10'
  }`
  const sectionHeadingClasses = `${isPanel ? 'text-lg' : 'text-xl'} font-medium`
  const labelClasses = `${isPanel ? 'mt-2 text-sm' : 'mt-3'} block font-medium`
  const nestedLabelClasses = `${isPanel ? 'text-sm' : ''} block font-medium`
  const fieldGridClasses = `${isPanel ? 'mt-2 gap-3' : 'mt-3 gap-4'} grid grid-cols-2`

  const handleBirthYearChange = (value: string) => {
    const year = parseBoundedInteger(value, MIN_BIRTH_YEAR, CURRENT_YEAR)
    setBirthYear(value)
    setApproxAge(year === null ? '' : (CURRENT_YEAR - year).toString())
  }
  const handleApproxAgeChange = (value: string) => {
    const age = parseBoundedInteger(value, 0, MAX_APPROX_AGE)
    setApproxAge(value)
    setBirthYear(age === null ? '' : (CURRENT_YEAR - age).toString())
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedDescription = description.trim()
    const normalizedAdoptionFormUrl = adoptionFormUrl.trim()
    const validBirthYear = parseBoundedInteger(birthYear, MIN_BIRTH_YEAR, CURRENT_YEAR)
    const validApproxAge = parseBoundedInteger(approxAge, 0, MAX_APPROX_AGE)
    if (
      !normalizedName ||
      normalizedName.length > MAX_NAME_LENGTH ||
      !normalizedDescription ||
      normalizedDescription.length > MAX_DESCRIPTION_LENGTH ||
      !normalizedAdoptionFormUrl ||
      !gender ||
      !size ||
      validBirthYear === null ||
      validApproxAge === null
    ) return

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        id: dog?.id,
        name: normalizedName,
        gender,
        size,
        birthYear: validBirthYear,
        description: normalizedDescription,
        status: dog?.status ?? 'disponivel',
        adoptionFormUrl: normalizedAdoptionFormUrl,
        featured,
        photos,
      })
    } catch {
      setSaveError('Não foi possível salvar o cão.')
    } finally {
      setIsSaving(false)
    }
  }

  const dadosSection = (
    <section>
      <h3 className={sectionHeadingClasses}>Dados</h3>
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
        className={fieldClasses}
      />

      <div className={fieldGridClasses}>
        <div>
          <label htmlFor={`${formId}-gender`} className={nestedLabelClasses}>
            Gênero*
          </label>
          <div className="relative">
            <select
              id={`${formId}-gender`}
              value={gender}
              onChange={(event) => setGender(event.target.value as DogGender)}
              required
              className={selectClasses}
            >
              <option value="" disabled>
                Selecionar
              </option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </select>
            <Icon
              name="arrow-separate-vertical"
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isPanel ? 'right-3 size-3' : 'right-4 size-4'}`}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${formId}-size`} className={nestedLabelClasses}>
            Porte*
          </label>
          <div className="relative">
            <select
              id={`${formId}-size`}
              value={size}
              onChange={(event) => setSize(event.target.value as DogSize)}
              required
              className={selectClasses}
            >
              <option value="" disabled>
                Selecionar
              </option>
              <option value="pequeno">Pequeno</option>
              <option value="medio">Médio</option>
              <option value="grande">Grande</option>
            </select>
            <Icon
              name="arrow-separate-vertical"
              className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${isPanel ? 'right-3 size-3' : 'right-4 size-4'}`}
            />
          </div>
        </div>
      </div>

      <div className={`${isPanel ? 'mt-2 gap-2' : 'mt-3 gap-3'} grid grid-cols-[1fr_auto_1fr] items-end`}>
        <div>
          <label htmlFor={`${formId}-birth-year`} className={nestedLabelClasses}>
            Ano de Nascimento*
          </label>
          <input
            id={`${formId}-birth-year`}
            type="number"
            value={birthYear}
            onChange={(event) => handleBirthYearChange(event.target.value)}
            placeholder="0000"
            min={MIN_BIRTH_YEAR}
            max={CURRENT_YEAR}
            step={1}
            required
            className={fieldClasses}
          />
        </div>
        <span className={`${isPanel ? 'pb-1.5 text-sm' : 'pb-3'} font-medium`}>Ou</span>
        <div>
          <label htmlFor={`${formId}-approx-age`} className={nestedLabelClasses}>
            Idade (aprox.)*
          </label>
          <input
            id={`${formId}-approx-age`}
            type="number"
            value={approxAge}
            onChange={(event) => handleApproxAgeChange(event.target.value)}
            placeholder="0000"
            min={0}
            max={MAX_APPROX_AGE}
            step={1}
            required
            className={fieldClasses}
          />
        </div>
      </div>

      <div className={`${isPanel ? 'mt-2 text-sm' : 'mt-3'} flex items-center justify-between gap-2`}>
        <label htmlFor={`${formId}-description`} className="font-medium">
          Descrição*
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
        placeholder="Ex: Doguinho é um cachorro animado e querido por todo o abrigo, recém-chegado. Ele gosta de correr e brincar com os outros cães."
        maxLength={MAX_DESCRIPTION_LENGTH}
        aria-describedby={`${formId}-description-count`}
        rows={2}
        required
        className={`mt-1 w-full resize-y rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50 ${isPanel ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}
      />
    </section>
  )

  const adocaoSection = (
    <section className={`${isPanel ? 'mt-3 pt-3' : 'mt-4 pt-4'} border-t border-cinza-claro dark:border-cinza-medio`}>
      <h3 className={sectionHeadingClasses}>Adoção</h3>
      <label htmlFor={`${formId}-form-url`} className={`${isPanel ? 'mt-2 text-sm' : 'mt-3'} flex items-center gap-2 font-medium`}>
        Link do formulário de adoção
        <Icon name="info-circle-solid" className="size-4 opacity-60" aria-hidden="true" />
      </label>
      <input
        id={`${formId}-form-url`}
        value={adoptionFormUrl}
        onChange={(event) => setAdoptionFormUrl(event.target.value)}
        placeholder="https://forms.gle/..."
        type="url"
        required
        className={fieldClasses}
      />

      <div className={`${isPanel ? 'mt-2 gap-2' : 'mt-3 gap-4'} flex flex-wrap items-center justify-between`}>
        <span className={`${isPanel ? 'text-sm' : ''} flex items-center gap-2 font-medium`}>
          Destacar no catálogo
          <Icon name="info-circle-solid" className="size-4 opacity-60" aria-hidden="true" />
        </span>
        <Switch checked={featured} onChange={setFeatured} className={isPanel ? 'origin-left scale-75' : ''} />
      </div>
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
      subjectLabel={dog?.name || name || 'cão'}
    />
  )

  const buttonsRow = (
    <div className={`${isPanel ? 'mt-4 gap-3' : 'mt-4 gap-4'} flex`}>
      <Action onClick={onCancel} size="small" variant="secondary" className={`${isPanel ? 'w-20' : 'w-28'} shrink-0`}>
        Cancelar
      </Action>
      <Action type="submit" size="small" variant="primary" disabled={isCompressing || isSaving} className="min-w-0 flex-1">
        {isSaving ? 'Salvando...' : 'Salvar Cão'}
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
          {adocaoSection}
          {buttonsRow}
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <h2 className="text-3xl font-medium text-marca">{title}</h2>
      <div className="mt-5">{dadosSection}</div>
      {adocaoSection}
      {imagensSection}
      {buttonsRow}
    </form>
  )
}
