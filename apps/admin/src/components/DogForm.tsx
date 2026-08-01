import { useId, useState } from 'react'
import {
  Action,
  getAdminErrorMessage,
  Icon,
  TextField,
  toEditableDogPhotos,
  useAdminSiteSettings,
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

type DogField = 'adoptionFormUrl' | 'approxAge' | 'birthYear' | 'description' | 'gender' | 'name' | 'size'

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} role="alert" className="mt-1 text-xs font-medium text-marca">{message}</p> : null
}

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
  const { data: siteSettings } = useAdminSiteSettings()
  const [adoptionFormUrl, setAdoptionFormUrl] = useState(dog?.adoptionFormUrl ?? '')
  const [photos, setPhotos] = useState(() => toEditableDogPhotos(dog))
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DogField, string>>>({})
  const isPanel = layout === 'panel'
  const fieldClasses = 'mt-1 h-8 px-3 text-sm'
  const selectClasses = `${
    isPanel
      ? 'bg-marca-clara text-marca dark:bg-marca-escura dark:text-marca'
      : 'bg-cinza-claro text-cinza-escuro dark:bg-marca-escura dark:text-marca'
  } mt-1 w-full appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marca ${
    isPanel ? 'h-8 px-3 pr-8 text-sm' : 'h-8 px-4 pr-8 text-sm'
  }`
  const sectionHeadingClasses = `${isPanel ? 'text-lg' : 'text-xl'} font-medium`
  const labelClasses = 'mt-2 block text-sm font-medium'
  const nestedLabelClasses = 'block text-sm font-medium'
  const fieldGridClasses = `${isPanel ? 'gap-3' : 'gap-4'} mt-2 grid grid-cols-2`

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
    const errors: Partial<Record<DogField, string>> = {}
    if (normalizedAdoptionFormUrl && !/^https:\/\//i.test(normalizedAdoptionFormUrl)) {
      errors.adoptionFormUrl = 'O link precisa começar com https://.'
    }
    if (!normalizedName) errors.name = 'Informe o nome do cão.'
    else if (normalizedName.length > MAX_NAME_LENGTH) errors.name = `Use no máximo ${MAX_NAME_LENGTH} caracteres.`
    if (!normalizedDescription) errors.description = 'Informe uma descrição.'
    else if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) errors.description = `Use no máximo ${MAX_DESCRIPTION_LENGTH} caracteres.`
    if (!gender) errors.gender = 'Selecione o gênero.'
    if (!size) errors.size = 'Selecione o porte.'
    if (validBirthYear === null) errors.birthYear = `Informe um ano entre ${MIN_BIRTH_YEAR} e ${CURRENT_YEAR}.`
    if (validApproxAge === null) errors.approxAge = `Informe uma idade entre 0 e ${MAX_APPROX_AGE}.`
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0 || !gender || !size || validBirthYear === null) return

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
        featured: dog?.featured ?? false,
        adoptionFormUrl: normalizedAdoptionFormUrl,
        photos,
      })
    } catch (error) {
      setSaveError(getAdminErrorMessage(error, 'Não foi possível salvar o cão.'))
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
      <TextField
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
      <FieldError id={`${formId}-name-error`} message={fieldErrors.name} />

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
              aria-invalid={Boolean(fieldErrors.gender)}
              aria-describedby={fieldErrors.gender ? `${formId}-gender-error` : undefined}
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
          <FieldError id={`${formId}-gender-error`} message={fieldErrors.gender} />
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
              aria-invalid={Boolean(fieldErrors.size)}
              aria-describedby={fieldErrors.size ? `${formId}-size-error` : undefined}
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
          <FieldError id={`${formId}-size-error`} message={fieldErrors.size} />
        </div>
      </div>

      <div className={`${isPanel ? 'gap-2' : 'gap-3'} mt-2 grid grid-cols-[1fr_auto_1fr] items-end`}>
        <div>
          <label htmlFor={`${formId}-birth-year`} className={nestedLabelClasses}>
            Ano de Nascimento*
          </label>
          <TextField
            id={`${formId}-birth-year`}
            type="number"
            value={birthYear}
            onChange={(event) => handleBirthYearChange(event.target.value)}
            placeholder="0000"
            min={MIN_BIRTH_YEAR}
            max={CURRENT_YEAR}
            step={1}
            required
            aria-invalid={Boolean(fieldErrors.birthYear)}
            aria-describedby={fieldErrors.birthYear ? `${formId}-birth-year-error` : undefined}
            className={fieldClasses}
          />
          <FieldError id={`${formId}-birth-year-error`} message={fieldErrors.birthYear} />
        </div>
        <span className={`${isPanel ? 'pb-1.5' : 'pb-1'} text-sm font-medium`}>Ou</span>
        <div>
          <label htmlFor={`${formId}-approx-age`} className={nestedLabelClasses}>
            Idade (aprox.)*
          </label>
          <TextField
            id={`${formId}-approx-age`}
            type="number"
            value={approxAge}
            onChange={(event) => handleApproxAgeChange(event.target.value)}
            placeholder="0000"
            min={0}
            max={MAX_APPROX_AGE}
            step={1}
            required
            aria-invalid={Boolean(fieldErrors.approxAge)}
            aria-describedby={fieldErrors.approxAge ? `${formId}-approx-age-error` : undefined}
            className={fieldClasses}
          />
          <FieldError id={`${formId}-approx-age-error`} message={fieldErrors.approxAge} />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
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
      <TextField
        as="textarea"
        id={`${formId}-description`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Ex: Doguinho é um cachorro animado e querido por todo o abrigo, recém-chegado. Ele gosta de correr e brincar com os outros cães."
        maxLength={MAX_DESCRIPTION_LENGTH}
        aria-invalid={Boolean(fieldErrors.description)}
        aria-describedby={`${formId}-description-count${fieldErrors.description ? ` ${formId}-description-error` : ''}`}
        rows={2}
        required
        className="mt-1 resize-y px-3 py-2 text-sm"
      />
      <FieldError id={`${formId}-description-error`} message={fieldErrors.description} />
    </section>
  )

  const adocaoSection = (
    <section
      className={`mt-3 border-t pt-3 ${
        isPanel
          ? 'border-cinza-claro dark:border-cinza-medio'
          : 'border-cinza-medio dark:border-cinza-claro'
      }`}
    >
      <h3 className={sectionHeadingClasses}>Adoção</h3>
      <label htmlFor={`${formId}-adoption-form-url`} className={labelClasses}>
        Formulário deste cão
      </label>
      <TextField
        id={`${formId}-adoption-form-url`}
        type="url"
        value={adoptionFormUrl}
        onChange={(event) => setAdoptionFormUrl(event.target.value)}
        placeholder="Vazio usa o formulário global"
        aria-invalid={Boolean(fieldErrors.adoptionFormUrl)}
        aria-describedby={`${formId}-adoption-form-hint${fieldErrors.adoptionFormUrl ? ` ${formId}-adoption-form-url-error` : ''}`}
        className={fieldClasses}
      />
      <FieldError id={`${formId}-adoption-form-url-error`} message={fieldErrors.adoptionFormUrl} />
      <p id={`${formId}-adoption-form-hint`} className="mt-1 text-xs text-cinza-medio dark:text-cinza-claro">
        Sem preenchimento, o CTA usa o formulário global definido em Configurações.
        {siteSettings && (
          <a
            href={siteSettings.adoptionFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-marca underline"
          >
            {siteSettings.adoptionFormUrl}
          </a>
        )}
      </p>
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
    <div className={`${isPanel ? 'mt-4 gap-3' : 'mt-3 gap-4'} flex`}>
      <Action
        onClick={onCancel}
        size={isPanel ? 'small' : 'compact'}
        variant="secondary-adaptive"
        className={`${isPanel ? 'w-20' : 'w-28'} shrink-0`}
      >
        Cancelar
      </Action>
      <Action
        type="submit"
        size={isPanel ? 'small' : 'compact'}
        variant="primary"
        disabled={isCompressing || isSaving}
        className="min-w-0 flex-1"
      >
        {isSaving ? 'Salvando...' : 'Salvar Cão'}
      </Action>
    </div>
  )
  if (layout === 'panel') {
    return (
      <form onSubmit={handleSubmit} className="grid items-start gap-6 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="sm:col-span-2">
          <h2 className="text-3xl font-medium text-marca">{title}</h2>
          <div className="mt-4">{imagensSection}</div>
        </div>
        <div className="sm:col-start-2">
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
