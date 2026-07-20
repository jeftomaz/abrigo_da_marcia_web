import { useId, useState } from 'react'
import { Action, Icon } from '@abrigo/shared'
import type { EventDraft, EventKind, FundraisingEvent } from '../events/events'
import { toEditableEventPhotos } from '../events/events'
import { PhotoGalleryField } from './PhotoGalleryField'

type EventFormProps = {
  event: FundraisingEvent | null
  layout: 'modal' | 'panel'
  onCancel: () => void
  onSave: (event: EventDraft) => Promise<void>
  title: string
}

type FieldProps = {
  children?: React.ReactNode
  htmlFor: string
  label: string
  wide?: boolean
}

const EMPTY_EVENT: Omit<EventDraft, 'gallery'> = {
  kind: 'product',
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  fundraisingGoal: '',
  maxItemsPerReservation: '',
  productPrice: '',
  productDiscountPrice: '',
  productDiscountMinimum: '',
  variationName: '',
  variationOptions: '',
  raffleTotalNumbers: '',
  raffleNumberPrice: '',
  prize: '',
  paymentKey: '',
  city: '',
  paymentReceiver: '',
  pixCode: '',
  postPaymentInstructions: '',
  receiptFolderUrl: '',
}

function FormField({ children, htmlFor, label, wide = false }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className={`block min-w-0 font-medium ${wide ? 'col-span-2' : ''}`}>
      <span className="mb-1 block text-sm">{label}</span>
      {children}
    </label>
  )
}

export function EventForm({ event, layout, onCancel, onSave, title }: EventFormProps) {
  const formId = useId()
  const initial = event ?? EMPTY_EVENT
  const [draft, setDraft] = useState(initial)
  const [photos, setPhotos] = useState(() => toEditableEventPhotos(event))
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [newVariationOption, setNewVariationOption] = useState('')
  const isPanel = layout === 'panel'
  const fieldClasses = `${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'} w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const sectionClasses = 'border-t border-cinza-medio pt-3 dark:border-cinza-claro'
  const sectionTitleClasses = `${isPanel ? 'text-xl' : 'text-3xl'} font-medium`

  const setField = <Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const variationOptions = draft.variationOptions
    .split(',')
    .map((option) => option.trim())
    .filter(Boolean)

  const addVariationOption = () => {
    const option = newVariationOption.trim()
    if (!option || variationOptions.includes(option)) return
    setField('variationOptions', [...variationOptions, option].join(', '))
    setNewVariationOption('')
  }

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    if (!draft.title.trim() || !draft.description.trim()) return
    if (photos.length === 0) {
      setSaveError('Adicione ao menos uma imagem.')
      return
    }
    if (!window.confirm('Confirma que as informações do evento foram verificadas?')) return

    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        ...draft,
        id: event?.id,
        status: event?.status,
        title: draft.title.trim(),
        description: draft.description.trim(),
        gallery: photos,
      })
    } catch {
      setSaveError('Não foi possível salvar o evento.')
    } finally {
      setIsSaving(false)
    }
  }

  const generalSection = (
    <section>
      <h3 className={sectionTitleClasses}>Geral</h3>
      <div
        className={`mt-3 grid gap-3 ${
          isPanel
            ? 'grid-cols-[7rem_minmax(0,1fr)]'
            : 'grid-cols-[minmax(7rem,0.75fr)_minmax(0,1.75fr)]'
        }`}
      >
        <FormField htmlFor={`${formId}-kind`} label="Tipo">
          <span className="relative block">
            <select
              id={`${formId}-kind`}
              value={draft.kind}
              onChange={(changeEvent) => setField('kind', changeEvent.target.value as EventKind)}
              className="h-10 w-full appearance-none rounded-full bg-marca px-4 text-center text-sm text-marca-clara outline-none focus-visible:ring-2 focus-visible:ring-marca"
            >
              <option value="product">Venda de Produto</option>
              <option value="raffle">Rifa</option>
            </select>
            <Icon
              name="arrow-separate-vertical"
              className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
            />
          </span>
        </FormField>
        <FormField htmlFor={`${formId}-title`} label="Título">
          <input
            id={`${formId}-title`}
            value={draft.title}
            onChange={(changeEvent) => setField('title', changeEvent.target.value)}
            placeholder={draft.kind === 'raffle' ? 'Ex: Rifa da Copa' : 'Ex: Camiseta de Natal'}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-description`} label="Descrição" wide>
          <textarea
            id={`${formId}-description`}
            value={draft.description}
            onChange={(changeEvent) => setField('description', changeEvent.target.value)}
            placeholder="Descreva o evento e como ele ajudará o Abrigo."
            rows={isPanel ? 2 : 3}
            required
            className={`${fieldClasses} h-auto resize-y py-2`}
          />
        </FormField>
      </div>
    </section>
  )

  const objectivesSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Objetivos</h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <FormField htmlFor={`${formId}-start-date`} label="Data de início">
          <input
            id={`${formId}-start-date`}
            type="date"
            value={draft.startDate}
            onChange={(changeEvent) => setField('startDate', changeEvent.target.value)}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-end-date`} label="Data de fim">
          <input
            id={`${formId}-end-date`}
            type="date"
            value={draft.endDate}
            onChange={(changeEvent) => setField('endDate', changeEvent.target.value)}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-goal`} label="Arrecadação (R$)">
          <input
            id={`${formId}-goal`}
            inputMode="decimal"
            value={draft.fundraisingGoal}
            onChange={(changeEvent) => setField('fundraisingGoal', changeEvent.target.value)}
            placeholder="1000"
            required
            className={fieldClasses}
          />
        </FormField>
      </div>
    </section>
  )

  const productSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Detalhes - Produto</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 desk:grid-cols-3">
        <FormField htmlFor={`${formId}-product-price`} label="Preço do produto (R$)*">
          <input
            id={`${formId}-product-price`}
            inputMode="decimal"
            value={draft.productPrice}
            onChange={(changeEvent) => setField('productPrice', changeEvent.target.value)}
            required={draft.kind === 'product'}
            className={fieldClasses}
          />
        </FormField>
        <div className="hidden desk:block">
          <FormField htmlFor={`${formId}-discount-price`} label="Preço com desconto (R$)">
            <input
              id={`${formId}-discount-price`}
              inputMode="decimal"
              value={draft.productDiscountPrice}
              onChange={(changeEvent) => setField('productDiscountPrice', changeEvent.target.value)}
              className={fieldClasses}
            />
          </FormField>
        </div>
        <div className="hidden desk:block">
          <FormField htmlFor={`${formId}-discount-minimum`} label="Qtd. mínima p/ desconto">
            <input
              id={`${formId}-discount-minimum`}
              inputMode="numeric"
              value={draft.productDiscountMinimum}
              onChange={(changeEvent) => setField('productDiscountMinimum', changeEvent.target.value)}
              className={fieldClasses}
            />
          </FormField>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <FormField htmlFor={`${formId}-variation-name`} label="Nome da variação">
          <input
            id={`${formId}-variation-name`}
            value={draft.variationName}
            onChange={(changeEvent) => setField('variationName', changeEvent.target.value)}
            placeholder="Tamanho"
            className={fieldClasses}
          />
        </FormField>
        <label htmlFor={`${formId}-variation-options`} className="block min-w-0 font-medium">
          <span className="mb-1 block text-sm">Valores</span>
          <span
            className={`${fieldClasses} flex h-auto min-h-11 flex-wrap items-center gap-1 py-1 ${
              isPanel ? 'min-h-8' : ''
            }`}
          >
            {variationOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setField(
                    'variationOptions',
                    variationOptions.filter((item) => item !== option).join(', '),
                  )
                }
                aria-label={`Remover opção ${option}`}
                className="rounded-md bg-marca px-2 py-1 text-sm text-marca-escura"
              >
                {option}
              </button>
            ))}
            <input
              id={`${formId}-variation-options`}
              value={newVariationOption}
              onChange={(changeEvent) => setNewVariationOption(changeEvent.target.value)}
              onKeyDown={(keyEvent) => {
                if (keyEvent.key !== 'Enter') return
                keyEvent.preventDefault()
                addVariationOption()
              }}
              aria-label="Nova opção"
              className="min-w-12 flex-1 bg-transparent outline-none"
            />
          </span>
        </label>
      </div>
      <Action
        onClick={addVariationOption}
        icon="plus-circle-solid"
        size="small"
        variant="primary-adaptive"
        className="mt-3 px-3"
      >
        Nova Opção
      </Action>
    </section>
  )

  const raffleSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Detalhes - Rifa</h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <FormField htmlFor={`${formId}-raffle-total`} label="Quantidade de números*">
          <input
            id={`${formId}-raffle-total`}
            inputMode="numeric"
            value={draft.raffleTotalNumbers}
            onChange={(changeEvent) => setField('raffleTotalNumbers', changeEvent.target.value)}
            required={draft.kind === 'raffle'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-raffle-price`} label="Valor por número (R$)*">
          <input
            id={`${formId}-raffle-price`}
            inputMode="decimal"
            value={draft.raffleNumberPrice}
            onChange={(changeEvent) => setField('raffleNumberPrice', changeEvent.target.value)}
            required={draft.kind === 'raffle'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-raffle-max`} label="Máx. por reserva">
          <input
            id={`${formId}-raffle-max`}
            inputMode="numeric"
            value={draft.maxItemsPerReservation}
            onChange={(changeEvent) => setField('maxItemsPerReservation', changeEvent.target.value)}
            className={fieldClasses}
          />
        </FormField>
      </div>
      <div className="mt-4">
        <h4 className={`${isPanel ? 'text-base' : 'text-2xl'} font-medium`}>Prêmios</h4>
        <div className="mt-3 flex gap-4">
          <div className={isPanel ? 'w-20' : 'w-32'}>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-cinza-claro dark:bg-cinza-medio">
              <Icon
                name="pata"
                className="absolute top-1/2 left-1/2 size-9 -translate-1/2 text-cinza-medio dark:text-cinza-claro"
              />
              {photos[0] && (
                <img
                  src={photos[0].previewUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <label htmlFor={`${formId}-prize`} className="sr-only">
              Nome do prêmio
            </label>
            <input
              id={`${formId}-prize`}
              value={draft.prize}
              onChange={(changeEvent) => setField('prize', changeEvent.target.value)}
              placeholder="Nome do prêmio"
              required={draft.kind === 'raffle'}
              className="mt-1 w-full truncate bg-transparent text-sm outline-none"
            />
            <Action
              onClick={() => document.getElementById(`${formId}-prize`)?.focus()}
              icon="edit-pencil"
              size="small"
              variant="neutral-adaptive"
              className="mt-2 px-3"
            >
              Editar
            </Action>
          </div>
          <button
            type="button"
            onClick={() => document.getElementById(`${formId}-photos`)?.click()}
            className={`${isPanel ? 'w-20' : 'w-32'} flex flex-col gap-2 text-left font-medium`}
          >
            <span className="flex aspect-square w-full items-center justify-center rounded-2xl bg-cinza-medio text-cinza-escuro">
              <Icon name="plus-circle-solid" className="size-10" />
            </span>
            <span>Adicionar prêmio</span>
          </button>
        </div>
      </div>
    </section>
  )

  const paymentSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Pagamento</h3>
      <p className="mt-1 text-xs text-cinza-medio dark:text-cinza-claro">
        Preencha os dados para gerar o Pix copia e cola ou informe um código personalizado.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <FormField htmlFor={`${formId}-payment-key`} label="Chave PIX">
          <input
            id={`${formId}-payment-key`}
            value={draft.paymentKey}
            onChange={(changeEvent) => setField('paymentKey', changeEvent.target.value)}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-city`} label="Cidade do recebedor">
          <input
            id={`${formId}-city`}
            value={draft.city}
            onChange={(changeEvent) => setField('city', changeEvent.target.value)}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-receiver`} label="Nome do recebedor">
          <input
            id={`${formId}-receiver`}
            value={draft.paymentReceiver}
            onChange={(changeEvent) => setField('paymentReceiver', changeEvent.target.value)}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-pix-code`} label="Pix copia-e-cola personalizado" wide>
          <input
            id={`${formId}-pix-code`}
            value={draft.pixCode}
            onChange={(changeEvent) => setField('pixCode', changeEvent.target.value)}
            placeholder="Opcional"
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-instructions`} label="Instruções pós-pagamento" wide>
          <input
            id={`${formId}-instructions`}
            value={draft.postPaymentInstructions}
            onChange={(changeEvent) => setField('postPaymentInstructions', changeEvent.target.value)}
            placeholder="Ex: envie o comprovante para o número (99) 99999-8888"
            className={fieldClasses}
          />
        </FormField>
        <details className="col-span-2">
          <summary className="cursor-pointer text-sm font-medium">
            Link externo dos comprovantes (opcional)
          </summary>
          <input
            id={`${formId}-receipts-url`}
            type="url"
            value={draft.receiptFolderUrl}
            onChange={(changeEvent) => setField('receiptFolderUrl', changeEvent.target.value)}
            placeholder="Ex: https://drive.google.com/..."
            aria-label="Link externo dos comprovantes"
            className={`${fieldClasses} mt-2`}
          />
        </details>
      </div>
    </section>
  )

  const imagesSection = (
    <PhotoGalleryField
      error={saveError}
      formId={formId}
      layout={layout}
      onProcessingChange={setIsCompressing}
      photos={photos}
      setPhotos={setPhotos}
      showCoverPreview={draft.kind === 'product'}
      subjectLabel={event?.title || draft.title || 'evento'}
      title={draft.kind === 'raffle' ? 'Imagens do Evento' : 'Imagens'}
    />
  )

  const buttonsRow = (
    <div className="mt-5">
      <div className="flex gap-4">
        <Action
          onClick={onCancel}
          size="small"
          variant="secondary-adaptive"
          className={`${isPanel ? 'w-24' : 'w-32'} shrink-0`}
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
          {isSaving ? 'Salvando...' : 'Salvar Evento'}
        </Action>
      </div>
    </div>
  )

  const detailsSection = draft.kind === 'product' ? productSection : raffleSection

  if (isPanel) {
    return (
      <form onSubmit={handleSubmit} className="grid grid-cols-[14rem_minmax(0,1fr)] items-start gap-6">
        <div>
          <h2 className="text-3xl font-medium text-marca">{title}</h2>
          <div className="mt-4">{imagesSection}</div>
        </div>
        <div className="space-y-3">
          {generalSection}
          {objectivesSection}
          {detailsSection}
          {paymentSection}
          {buttonsRow}
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-4xl font-medium text-marca">{title}</h2>
      <div className="mt-5 space-y-4">
        {generalSection}
        {objectivesSection}
        {detailsSection}
        {paymentSection}
        {imagesSection}
      </div>
      {buttonsRow}
    </form>
  )
}
