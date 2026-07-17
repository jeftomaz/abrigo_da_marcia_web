import { useId, useState } from 'react'
import { Action, Icon, Switch } from '@abrigo/shared'
import type { Dog, DogGender, DogSize } from '../data/dogs'
import { DEFAULT_ADOPTION_FORM_URL } from '../data/dogs'

type DogFormProps = {
  dog: Dog | null
  layout: 'modal' | 'panel'
  title: string
  onCancel: () => void
  onSave: (dog: Dog) => void
}

const MAX_PHOTOS = 5
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
  const [photos, setPhotos] = useState(dog?.photos ?? [])
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

  const addPhoto = () => setPhotos((current) => [...current, `foto-${current.length + 1}-${Date.now()}`])
  const removePhoto = (photo: string) => setPhotos((current) => current.filter((item) => item !== photo))
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const validBirthYear = parseBoundedInteger(birthYear, MIN_BIRTH_YEAR, CURRENT_YEAR)
    const validApproxAge = parseBoundedInteger(approxAge, 0, MAX_APPROX_AGE)
    if (!gender || !size || validBirthYear === null || validApproxAge === null) return

    onSave({
      id: dog?.id ?? crypto.randomUUID(),
      name,
      gender,
      size,
      birthYear: validBirthYear,
      description,
      status: dog?.status ?? 'disponivel',
      adoptionFormUrl,
      featured,
      photos,
    })
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

      <label htmlFor={`${formId}-description`} className={labelClasses}>
        Descrição
      </label>
      <textarea
        id={`${formId}-description`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Ex: Doguinho é um cachorro animado e querido por todo o abrigo, recém-chegado. Ele gosta de correr e brincar com os outros cães."
        rows={2}
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
    <section className={isPanel ? '' : 'mt-4 border-t border-cinza-claro pt-4 dark:border-cinza-medio'}>
      <h3 className={sectionHeadingClasses}>Imagens</h3>
      <p className={`${isPanel ? 'mt-2 text-sm' : 'mt-3'} font-medium`}>
        Galeria de Divulgação ({photos.length}/{MAX_PHOTOS})
      </p>
      <div className={`mt-2 grid gap-2 ${isPanel ? 'grid-cols-3' : 'grid-cols-[repeat(4,4rem)]'}`}>
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={addPhoto}
            aria-label="Adicionar foto"
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-cinza-medio text-xs font-medium text-cinza-medio dark:border-cinza-claro dark:text-cinza-claro"
          >
            <Icon name="plus-circle-solid" className="size-6" />
            Adicionar
          </button>
        )}
        {photos.map((photo) => (
          <div key={photo} className="relative aspect-square overflow-hidden rounded-xl bg-cinza-claro dark:bg-cinza-medio">
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="pata" className="size-8 text-cinza-medio dark:text-cinza-claro" />
            </div>
            <button
              type="button"
              onClick={() => removePhoto(photo)}
              aria-label="Remover foto"
              className="absolute top-1 right-1 rounded-full bg-cinza-escuro/70 p-1 text-cinza-claro"
            >
              <Icon name="xmark-circle-solid" className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  )

  const buttonsRow = (
    <div className={`${isPanel ? 'mt-4 gap-3' : 'mt-4 gap-4'} flex`}>
      <Action onClick={onCancel} size="small" variant="secondary" className={`${isPanel ? 'w-20' : 'w-28'} shrink-0`}>
        Cancelar
      </Action>
      <Action type="submit" size="small" variant="primary" className="min-w-0 flex-1">
        Salvar Cão
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
