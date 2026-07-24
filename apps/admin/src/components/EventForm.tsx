import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import {
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  Action,
  Dialog,
  Icon,
  ImagePlaceholder,
  Switch,
  TextField,
  compressImage,
  createPixCode,
  getEventErrorMessage,
  useAdminSiteSettings,
  useEventSettings,
} from '@abrigo/shared'
import type { EditablePhoto } from '@abrigo/shared'
import type { EditableEventProduct, EditableRafflePrize, EventDraft, EventKind, FundraisingEvent, MeasurementTable } from '../events/events'
import { formatCurrencyInput, parseCurrencyToCents, toEditableEventDraft } from '../events/events'
import { PhotoGalleryField } from './PhotoGalleryField'
import { ConfirmationDialog } from './ConfirmationDialog'
import { TagInput } from './TagInput'

type EventFormProps = {
  event: FundraisingEvent | null
  layout: 'modal' | 'panel'
  onAutoSave: (event: EventDraft) => Promise<void>
  onCancel: () => void
  onSave: (event: EventDraft) => Promise<void>
  title: string
}

export type EventFormHandle = { dismiss: () => Promise<void> }

type FieldProps = {
  children?: React.ReactNode
  htmlFor: string
  label: string
  wide?: boolean
}

type ExpirationUnit = 'hours' | 'minutes'
type MeasurementGuideKind = 'image' | 'none' | 'table'
type ValidationIssue = { fieldId: string; message: string }

function emptyProduct(): EditableEventProduct {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    price: '',
    discountPrice: '',
    discountMinimum: '',
    gallery: [],
    variations: [],
  }
}

function emptyEvent(): EventDraft {
  return {
    kind: 'product',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    fundraisingGoal: '',
    maxItemsPerReservation: '',
    reservationTtlMinutes: '',
    products: [emptyProduct()],
    gallery: [],
    raffleTotalNumbers: '',
    raffleNumberPrice: '',
    prizes: [],
    paymentKey: '',
    city: '',
    paymentReceiver: '',
    postPaymentInstructions: '',
    receiptFolderUrl: '',
  }
}

function hasDraftContent(draft: EventDraft, photos: EditablePhoto[]) {
  if (draft.kind !== 'product' || photos.length > 0) return true
  if ([
    draft.title,
    draft.description,
    draft.startDate,
    draft.endDate,
    draft.fundraisingGoal,
    draft.maxItemsPerReservation,
    draft.reservationTtlMinutes,
    draft.raffleTotalNumbers,
    draft.raffleNumberPrice,
    draft.paymentKey,
    draft.city,
    draft.paymentReceiver,
    draft.postPaymentInstructions,
    draft.receiptFolderUrl,
  ].some((value) => value.trim())) return true
  if (draft.prizes.length > 0 || draft.products.length > 1) return true
  return draft.products.some((product) => (
    [product.name, product.description, product.price, product.discountPrice, product.discountMinimum].some((value) => value.trim()) ||
    product.gallery.length > 0 ||
    Boolean(product.measurementGuide) ||
    product.variations.some((variation) => variation.name.trim() || variation.options.length > 0)
  ))
}

function isPositiveInteger(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0
}

function formatMinutesAsHours(value: string) {
  const minutes = Number(value)
  if (!Number.isFinite(minutes) || minutes <= 0) return ''
  return (minutes / 60).toLocaleString('pt-BR', { maximumFractionDigits: 4 })
}

function measurementVariationId(product: EditableEventProduct, table: MeasurementTable) {
  if (table.variationId && product.variations.some((variation) => variation.id === table.variationId && variation.options.length > 0)) {
    return table.variationId
  }
  return product.variations.find((variation) => (
    variation.options.length > 0 &&
    variation.options.length === table.sizes.length &&
    variation.options.every((option, index) => option.name === table.sizes[index])
  ))?.id ?? ''
}

function resizeMeasurementTable(table: MeasurementTable, sizes: string[], variationId: string) {
  return {
    ...table,
    variationId,
    sizes,
    sections: table.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        values: sizes.map((size) => {
          const previousIndex = table.sizes.indexOf(size)
          return previousIndex >= 0 ? row.values[previousIndex] ?? '' : ''
        }),
      })),
    })),
  }
}

function FormField({ children, htmlFor, label, wide = false }: FieldProps) {
  return (
    <div className={`block min-w-0 font-medium ${wide ? 'col-span-2' : ''}`}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm">{label}</label>
      {children}
    </div>
  )
}

export const EventForm = forwardRef<EventFormHandle, EventFormProps>(function EventForm({ event, layout, onAutoSave, onCancel, onSave, title }, ref) {
  const formId = useId()
  const today = new Date().toISOString().slice(0, 10)
  const { data: eventSettings } = useEventSettings()
  const { data: siteSettings } = useAdminSiteSettings()
  const initial: EventDraft = event ? toEditableEventDraft(event) : emptyEvent()
  const [draft, setDraft] = useState<EventDraft>(initial)
  const [photos, setPhotos] = useState(() => initial.gallery)
  const [expirationUnit, setExpirationUnit] = useState<ExpirationUnit>('minutes')
  const [expirationHours, setExpirationHours] = useState(() => formatMinutesAsHours(initial.reservationTtlMinutes))
  const [measurementGuideKinds, setMeasurementGuideKinds] = useState<Record<string, MeasurementGuideKind>>(
    () => Object.fromEntries(initial.products.map((product) => [product.id, product.measurementGuide?.kind ?? 'none'])),
  )
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isPrizeDialogOpen, setIsPrizeDialogOpen] = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [prizeDraft, setPrizeDraft] = useState('')
  const [prizePhoto, setPrizePhoto] = useState<EditablePhoto | null>(null)
  const [isPrizeCompressing, setIsPrizeCompressing] = useState(false)
  const createdPrizeUrls = useRef(new Set<string>())
  const appliedPaymentDefaults = useRef(false)
  const isPanel = layout === 'panel'
  const fieldClasses = isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'
  const sectionClasses = 'border-t border-cinza-medio pt-3 dark:border-cinza-claro'
  const sectionTitleClasses = `${isPanel ? 'text-xl' : 'text-3xl'} font-medium`

  useEffect(() => () => {
    createdPrizeUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    if (event || !eventSettings || !siteSettings || appliedPaymentDefaults.current) return
    appliedPaymentDefaults.current = true
    setDraft((current) => ({
      ...current,
      paymentKey: current.paymentKey || siteSettings.pixKey,
      city: current.city || siteSettings.pixCity,
      paymentReceiver: current.paymentReceiver || siteSettings.pixReceiver,
      postPaymentInstructions: current.postPaymentInstructions || eventSettings.defaultPostPaymentInstructions,
    }))
  }, [event, eventSettings, siteSettings])

  const setField = <Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) => {
    setSaveError('')
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateProduct = (id: string, changes: Partial<EditableEventProduct>) => {
    setSaveError('')
    setDraft((current) => ({
      ...current,
      products: current.products.map((product) => product.id === id ? { ...product, ...changes } : product),
    }))
  }

  const addVariation = (product: EditableEventProduct) => {
    const id = crypto.randomUUID()
    updateProduct(product.id, {
      variations: [...product.variations, { id, name: '', options: [] }],
    })
    requestAnimationFrame(() => document.getElementById(`${formId}-variation-${id}`)?.focus())
  }

  const updateVariation = (
    product: EditableEventProduct,
    id: string,
    changes: Partial<(typeof product.variations)[number]>,
  ) => {
    updateProduct(product.id, {
      variations: product.variations.map((variation) =>
        variation.id === id ? { ...variation, ...changes } : variation,
      ),
    })
  }

  const updateVariationOptions = (
    product: EditableEventProduct,
    variationId: string,
    options: EditableEventProduct['variations'][number]['options'],
  ) => {
    const guide = product.measurementGuide
    const selectedVariationId = guide?.kind === 'table' ? measurementVariationId(product, guide.table) : ''
    updateProduct(product.id, {
      variations: product.variations.map((variation) =>
        variation.id === variationId ? { ...variation, options } : variation,
      ),
      measurementGuide: guide?.kind === 'table' && selectedVariationId === variationId
        ? { kind: 'table', table: resizeMeasurementTable(guide.table, options.map((option) => option.name), variationId) }
        : guide,
    })
  }

  const removeVariation = (product: EditableEventProduct, variationId: string) => {
    const guide = product.measurementGuide
    const removesMeasurementSource = guide?.kind === 'table' && measurementVariationId(product, guide.table) === variationId
    const measurementGuide = removesMeasurementSource && guide?.kind === 'table'
      ? { kind: 'table' as const, table: { ...guide.table, variationId: undefined, sizes: [], sections: guide.table.sections.map((section) => ({ ...section, rows: section.rows.map((row) => ({ ...row, values: [] })) })) } }
      : guide
    updateProduct(product.id, {
      variations: product.variations.filter((variation) => variation.id !== variationId),
      measurementGuide,
    })
  }

  const setProductPhotos = (
    productId: string,
    value: React.SetStateAction<EditablePhoto[]>,
  ) => {
    setSaveError('')
    setDraft((current) => ({
      ...current,
      products: current.products.map((product) => product.id === productId
        ? { ...product, gallery: typeof value === 'function' ? value(product.gallery) : value }
        : product,
      ),
    }))
  }

  const validateDraft = (): ValidationIssue | null => {
    if (!draft.title.trim()) return { fieldId: `${formId}-title`, message: 'Preencha o título do evento.' }
    if (!draft.description.trim()) return { fieldId: `${formId}-description`, message: 'Preencha a descrição do evento.' }
    if (!draft.endDate) return { fieldId: `${formId}-end-date`, message: 'Informe a data de fim.' }
    if ((draft.startDate || today) > draft.endDate) return { fieldId: `${formId}-end-date`, message: 'A data de fim não pode ser anterior à data de início.' }
    if (parseCurrencyToCents(draft.fundraisingGoal) <= 0) return { fieldId: `${formId}-goal`, message: 'Informe uma meta de arrecadação maior que zero.' }
    if (draft.maxItemsPerReservation && !isPositiveInteger(draft.maxItemsPerReservation)) {
      return { fieldId: `${formId}-max-items`, message: 'O máximo por reserva deve ser um número inteiro maior que zero.' }
    }
    if (draft.reservationTtlMinutes && (!isPositiveInteger(draft.reservationTtlMinutes) || Number(draft.reservationTtlMinutes) < 1)) {
      return { fieldId: `${formId}-ttl`, message: 'O tempo de expiração deve corresponder a pelo menos 1 minuto.' }
    }
    if (photos.length === 0) return { fieldId: `${formId}-gallery`, message: 'Adicione ao menos uma imagem à galeria de divulgação do evento.' }

    if (draft.kind === 'raffle') {
      if (!isPositiveInteger(draft.raffleTotalNumbers) || Number(draft.raffleTotalNumbers) > 1000) {
        return { fieldId: `${formId}-raffle-total`, message: 'A quantidade de números da rifa deve ser um inteiro entre 1 e 1.000.' }
      }
      if (parseCurrencyToCents(draft.raffleNumberPrice) <= 0) {
        return { fieldId: `${formId}-raffle-price`, message: 'Informe um valor por número maior que zero.' }
      }
      if (draft.prizes.length === 0) return { fieldId: `${formId}-prizes`, message: 'Adicione ao menos um prêmio à rifa.' }
    } else {
      if (draft.products.length === 0) return { fieldId: `${formId}-products`, message: 'Adicione ao menos um produto ao catálogo.' }
      const normalizedNames = draft.products.map((product) => product.name.trim().toLocaleLowerCase('pt-BR')).filter(Boolean)
      if (new Set(normalizedNames).size !== normalizedNames.length) {
        return { fieldId: `${formId}-products`, message: 'Cada produto do catálogo precisa ter um nome diferente.' }
      }
      const effectiveMaximum = Number(draft.maxItemsPerReservation) || eventSettings?.defaultMaxProductUnits || 10

      for (const [productIndex, product] of draft.products.entries()) {
        const productLabel = `Produto ${productIndex + 1}`
        if (!product.name.trim()) return { fieldId: `${formId}-product-name-${product.id}`, message: `${productLabel}: preencha o nome.` }
        if (parseCurrencyToCents(product.price) <= 0) return { fieldId: `${formId}-product-price-${product.id}`, message: `${productLabel} (${product.name}): informe um preço maior que zero.` }
        if (!product.description.trim()) return { fieldId: `${formId}-product-description-${product.id}`, message: `${productLabel} (${product.name}): preencha a descrição.` }
        if (product.gallery.length === 0) return { fieldId: `${formId}-product-${product.id}-gallery`, message: `${productLabel} (${product.name}): adicione ao menos uma imagem do produto.` }

        const hasDiscountPrice = parseCurrencyToCents(product.discountPrice) > 0
        const hasDiscountMinimum = Boolean(product.discountMinimum)
        if (hasDiscountPrice !== hasDiscountMinimum) {
          return {
            fieldId: hasDiscountPrice ? `${formId}-discount-minimum-${product.id}` : `${formId}-discount-price-${product.id}`,
            message: `${productLabel} (${product.name}): preencha juntos o preço com desconto e a quantidade mínima.`,
          }
        }
        if (hasDiscountPrice && parseCurrencyToCents(product.discountPrice) >= parseCurrencyToCents(product.price)) {
          return { fieldId: `${formId}-discount-price-${product.id}`, message: `${productLabel} (${product.name}): o preço com desconto deve ser menor que o preço normal.` }
        }
        if (hasDiscountMinimum && (!isPositiveInteger(product.discountMinimum) || Number(product.discountMinimum) < 2)) {
          return { fieldId: `${formId}-discount-minimum-${product.id}`, message: `${productLabel} (${product.name}): a quantidade mínima para desconto deve ser um inteiro igual ou maior que 2.` }
        }
        if (hasDiscountMinimum && Number(product.discountMinimum) > effectiveMaximum) {
          return { fieldId: `${formId}-discount-minimum-${product.id}`, message: `${productLabel} (${product.name}): a quantidade mínima para desconto deve ser igual ou menor que o máximo de ${effectiveMaximum} unidades por reserva.` }
        }

        for (const [variationIndex, variation] of product.variations.entries()) {
          if (!variation.name.trim()) return { fieldId: `${formId}-variation-${variation.id}`, message: `${productLabel} (${product.name}): preencha o nome da variação ${variationIndex + 1}.` }
          if (variation.options.length === 0) return { fieldId: `${formId}-variation-values-${variation.id}`, message: `${productLabel} (${product.name}): digite ao menos um valor para “${variation.name}” e pressione Enter.` }
        }
        const variationNames = product.variations.map((variation) => variation.name.trim().toLocaleLowerCase('pt-BR'))
        if (new Set(variationNames).size !== variationNames.length) {
          const duplicateIndex = variationNames.findIndex((name, index) => variationNames.indexOf(name) !== index)
          return { fieldId: `${formId}-variation-${product.variations[duplicateIndex].id}`, message: `${productLabel} (${product.name}): cada variação precisa ter um nome diferente.` }
        }

        const guideKind = measurementGuideKinds[product.id] ?? product.measurementGuide?.kind ?? 'none'
        if (guideKind === 'image' && product.measurementGuide?.kind !== 'image') {
          return { fieldId: `${formId}-measurement-upload-${product.id}`, message: `${productLabel} (${product.name}): envie a imagem do guia de medidas ou selecione “Sem guia”.` }
        }
        if (guideKind === 'table') {
          if (product.measurementGuide?.kind !== 'table') {
            return { fieldId: `${formId}-measurement-variation-${product.id}`, message: `${productLabel} (${product.name}): configure a tabela de medidas.` }
          }
          const { table } = product.measurementGuide
          if (!measurementVariationId(product, table) || table.sizes.length === 0) {
            return { fieldId: `${formId}-measurement-variation-${product.id}`, message: `${productLabel} (${product.name}): selecione a variação usada na tabela de medidas.` }
          }
          const rows = table.sections[0]?.rows ?? []
          if (rows.length === 0) return { fieldId: `${formId}-measurement-add-${product.id}`, message: `${productLabel} (${product.name}): adicione ao menos uma medida à tabela.` }
          for (const [rowIndex, row] of rows.entries()) {
            if (!row.label.trim()) return { fieldId: `${formId}-measurement-label-${product.id}-${rowIndex}`, message: `${productLabel} (${product.name}): informe o nome da medida ${rowIndex + 1}.` }
            const emptyValueIndex = row.values.findIndex((value) => !value.trim())
            if (row.values.length !== table.sizes.length || emptyValueIndex >= 0) {
              const valueIndex = emptyValueIndex >= 0 ? emptyValueIndex : 0
              return { fieldId: `${formId}-measurement-value-${product.id}-${rowIndex}-${valueIndex}`, message: `${productLabel} (${product.name}): preencha “${row.label}” para o valor ${table.sizes[valueIndex] ?? valueIndex + 1}.` }
            }
          }
        }
      }
    }

    if (!draft.postPaymentInstructions.trim()) return { fieldId: `${formId}-instructions`, message: 'Preencha as instruções pós-pagamento.' }
    if (event?.status === 'active' && (!draft.paymentKey.trim() || !draft.paymentReceiver.trim() || !draft.city.trim())) return { fieldId: `${formId}-payment-key`, message: 'Informe chave, recebedor e cidade do Pix do evento ativo.' }
    if (draft.receiptFolderUrl) {
      try {
        if (new URL(draft.receiptFolderUrl).protocol !== 'https:') throw new Error()
      } catch {
        return { fieldId: `${formId}-receipts-url`, message: 'O link externo dos comprovantes deve ser uma URL HTTPS válida.' }
      }
    }
    return null
  }

  const showValidationIssue = ({ fieldId, message }: ValidationIssue) => {
    setSaveError(message)
    requestAnimationFrame(() => {
      const field = document.getElementById(fieldId)
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      field?.focus({ preventScroll: true })
    })
  }

  const currentDraft = (): EventDraft => ({
    ...draft,
    id: event?.id,
    status: event?.status,
    gallery: photos,
  })

  const dismiss = async () => {
    if (isSaving) return
    if (isCompressing || isPrizeCompressing) {
      setSaveError('Aguarde o processamento das imagens antes de sair do formulário.')
      return
    }
    if ((event === null || event.status === 'draft') && hasDraftContent(draft, photos)) {
      setIsSaving(true)
      setSaveError('')
      try {
        await onAutoSave(currentDraft())
        onCancel()
      } catch (error) {
        setSaveError(`Não foi possível salvar o rascunho: ${getEventErrorMessage(error, 'erro desconhecido')}`)
      } finally {
        setIsSaving(false)
      }
      return
    }
    onCancel()
  }

  useImperativeHandle(ref, () => ({ dismiss }))

  const [confirmVerification, setConfirmVerification] = useState(false)

  const saveVerified = async () => {
    setConfirmVerification(false)
    setIsSaving(true)
    setSaveError('')
    try {
      await onSave({
        ...draft,
        id: event?.id,
        status: event?.status,
        title: draft.title.trim(),
        description: draft.description.trim(),
        startDate: draft.startDate || today,
        products: draft.kind === 'product' ? draft.products.map((product) => ({
          ...product,
          name: product.name.trim(),
          description: product.description.trim(),
          variations: product.variations.map((variation) => ({
            ...variation,
            name: variation.name.trim(),
            options: variation.options.map((option) => ({ ...option, name: option.name.trim() })).filter((option) => option.name),
          })).filter((variation) => variation.name && variation.options.length),
        })) : [],
        prizes: draft.kind === 'raffle' ? draft.prizes : [],
        gallery: photos,
      })
    } catch (error) {
      setSaveError(`Não foi possível salvar o evento: ${getEventErrorMessage(error, 'erro desconhecido')}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    setSaveError('')
    const validationIssue = validateDraft()
    if (validationIssue) {
      showValidationIssue(validationIssue)
      return
    }
    setConfirmVerification(true)
  }

  const handlePrizeImage = async (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
    const file = changeEvent.target.files?.[0]
    changeEvent.target.value = ''
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    createdPrizeUrls.current.add(previewUrl)
    setPrizePhoto({ key: crypto.randomUUID(), file, previewUrl })
    setIsPrizeCompressing(true)
    try {
      const compressedFile = await compressImage(file)
      setPrizePhoto((current) => current?.previewUrl === previewUrl ? { ...current, file: compressedFile } : current)
    } catch {
      URL.revokeObjectURL(previewUrl)
      createdPrizeUrls.current.delete(previewUrl)
      setPrizePhoto((current) => current?.previewUrl === previewUrl ? null : current)
      setSaveError('Não foi possível processar a imagem do prêmio.')
    } finally {
      setIsPrizeCompressing(false)
    }
  }

  const handleMeasurementImage = async (product: EditableEventProduct, file?: File) => {
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    createdPrizeUrls.current.add(previewUrl)
    setIsCompressing(true)
    try {
      const compressedFile = await compressImage(file)
      updateProduct(product.id, {
        measurementGuide: {
          kind: 'image',
          photo: { key: crypto.randomUUID(), file: compressedFile, previewUrl },
        },
      })
    } catch {
      URL.revokeObjectURL(previewUrl)
      createdPrizeUrls.current.delete(previewUrl)
      setSaveError('Não foi possível processar o guia de medidas.')
    } finally {
      setIsCompressing(false)
    }
  }

  const openPrizeDialog = (prize?: EditableRafflePrize) => {
    setEditingPrizeId(prize?.id ?? null)
    setPrizeDraft(prize?.name ?? '')
    setPrizePhoto(prize?.image ?? null)
    setIsPrizeDialogOpen(true)
  }

  const savePrize = () => {
    const name = prizeDraft.trim()
    if (!name || !prizePhoto) return
    const currentPrize = draft.prizes.find((prize) => prize.id === editingPrizeId)
    const savedPrize: EditableRafflePrize = {
      ...currentPrize,
      id: editingPrizeId ?? crypto.randomUUID(),
      image: prizePhoto,
      name,
    }
    setField(
      'prizes',
      editingPrizeId
        ? draft.prizes.map((prize) => prize.id === editingPrizeId ? savedPrize : prize)
        : [...draft.prizes, savedPrize],
    )
    setIsPrizeDialogOpen(false)
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
              disabled={Boolean(event && event.status !== 'draft')}
              onChange={(changeEvent) => setField('kind', changeEvent.target.value as EventKind)}
              className="h-10 w-full appearance-none rounded-full bg-marca px-4 text-center text-sm text-marca-clara outline-none focus-visible:ring-2 focus-visible:ring-marca disabled:cursor-not-allowed disabled:opacity-40"
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
          <TextField
            id={`${formId}-title`}
            value={draft.title}
            onChange={(changeEvent) => setField('title', changeEvent.target.value)}
            placeholder={draft.kind === 'raffle' ? 'Ex: Rifa da Copa' : 'Ex: Camiseta de Natal'}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-description`} label="Descrição" wide>
          <TextField
            as="textarea"
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
      <div className="mt-3 grid grid-cols-2 gap-3 desk:grid-cols-5">
        <FormField htmlFor={`${formId}-start-date`} label="Data de início">
          <TextField
            id={`${formId}-start-date`}
            type="date"
            value={draft.startDate || today}
            onChange={(changeEvent) => setField('startDate', changeEvent.target.value)}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-end-date`} label="Data de fim">
          <TextField
            id={`${formId}-end-date`}
            type="date"
            value={draft.endDate}
            onChange={(changeEvent) => setField('endDate', changeEvent.target.value)}
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-goal`} label="Arrecadação (R$)">
          <TextField
            id={`${formId}-goal`}
            inputMode="decimal"
            value={draft.fundraisingGoal}
            onChange={(changeEvent) => setField('fundraisingGoal', formatCurrencyInput(changeEvent.target.value))}
            placeholder="0,00"
            required
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-max-items`} label="Máx. por reserva">
          <TextField
            id={`${formId}-max-items`}
            inputMode="numeric"
            value={draft.maxItemsPerReservation}
            onChange={(changeEvent) => setField('maxItemsPerReservation', changeEvent.target.value)}
            placeholder="Padrão"
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-ttl`} label="Expiração da reserva">
          <div>
            <TextField
              id={`${formId}-ttl`}
              inputMode={expirationUnit === 'hours' ? 'decimal' : 'numeric'}
              value={expirationUnit === 'hours' ? expirationHours : draft.reservationTtlMinutes}
              onChange={(changeEvent) => {
                const value = changeEvent.target.value
                if (expirationUnit === 'minutes') {
                  setField('reservationTtlMinutes', value.replace(/\D/g, ''))
                  return
                }
                if (!/^\d*(?:[,.]\d*)?$/.test(value)) return
                setExpirationHours(value)
                const hours = Number(value.replace(',', '.'))
                setField('reservationTtlMinutes', value && Number.isFinite(hours) ? String(Math.round(hours * 60)) : '')
              }}
              placeholder="Padrão"
              className={fieldClasses}
            />
            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="whitespace-nowrap text-xs" aria-hidden="true">Minutos</span>
              <Switch
                checked={expirationUnit === 'hours'}
                onChange={(hours) => {
                  setExpirationUnit(hours ? 'hours' : 'minutes')
                  if (hours) setExpirationHours(formatMinutesAsHours(draft.reservationTtlMinutes))
                }}
                aria-label="Usar horas no tempo de expiração"
                className="origin-center scale-75"
              />
              <span className="whitespace-nowrap text-xs" aria-hidden="true">Horas</span>
            </div>
          </div>
        </FormField>
      </div>
    </section>
  )

  const productSection = (
    <section id={`${formId}-products`} tabIndex={-1} className={sectionClasses}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={sectionTitleClasses}>Catálogo de Produtos</h3>
        <Action onClick={() => setField('products', [...draft.products, emptyProduct()])} icon="plus-circle-solid" size="small" variant="primary-adaptive" className="px-3">Novo Produto</Action>
      </div>
      <div className="mt-3 space-y-4">
        {draft.products.map((product, productIndex) => {
          const tableGuide: MeasurementTable = product.measurementGuide?.kind === 'table'
            ? product.measurementGuide.table
            : { sizes: [], sections: [{ title: 'Medidas', rows: [] }] }
          const tableRows = tableGuide.sections[0]?.rows ?? []
          const guideKind = measurementGuideKinds[product.id] ?? product.measurementGuide?.kind ?? 'none'
          const selectedMeasurementVariationId = measurementVariationId(product, tableGuide)
          return (
            <article key={product.id} className="rounded-2xl bg-marca-clara p-4 text-marca">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-medium">Produto {productIndex + 1}</h4>
                {draft.products.length > 1 && <Action onClick={() => setField('products', draft.products.filter((item) => item.id !== product.id))} icon="trash-solid" size="small" variant="primary-adaptive" className="px-3">Remover</Action>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <FormField htmlFor={`${formId}-product-name-${product.id}`} label="Nome*">
                  <TextField id={`${formId}-product-name-${product.id}`} value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} required className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-product-price-${product.id}`} label="Preço (R$)*">
                  <TextField id={`${formId}-product-price-${product.id}`} inputMode="decimal" value={product.price} onChange={(event) => updateProduct(product.id, { price: formatCurrencyInput(event.target.value) })} placeholder="0,00" required className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-product-description-${product.id}`} label="Descrição*" wide>
                  <TextField as="textarea" id={`${formId}-product-description-${product.id}`} value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })} required rows={2} className={`${fieldClasses} h-auto resize-y py-2`} />
                </FormField>
                <FormField htmlFor={`${formId}-discount-price-${product.id}`} label="Preço com desconto">
                  <TextField id={`${formId}-discount-price-${product.id}`} inputMode="decimal" value={product.discountPrice} onChange={(event) => updateProduct(product.id, { discountPrice: formatCurrencyInput(event.target.value) })} placeholder="0,00" className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-discount-minimum-${product.id}`} label="Qtd. mínima p/ desconto">
                  <TextField id={`${formId}-discount-minimum-${product.id}`} inputMode="numeric" value={product.discountMinimum} onChange={(event) => updateProduct(product.id, { discountMinimum: event.target.value })} className={fieldClasses} />
                </FormField>
              </div>

              <PhotoGalleryField
                density="compact"
                formId={`${formId}-product-${product.id}`}
                layout={layout}
                onProcessingChange={setIsCompressing}
                photos={product.gallery}
                setPhotos={(value) => setProductPhotos(product.id, value)}
                subjectLabel={product.name || `produto ${productIndex + 1}`}
                title="Imagens do Produto"
              />

              <div className="mt-4 space-y-3">
                {product.variations.map((variation, index) => (
                  <div key={variation.id} className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-raised p-3 text-on-surface-raised">
                    <FormField htmlFor={`${formId}-variation-${variation.id}`} label="Nome da variação">
                      <TextField id={`${formId}-variation-${variation.id}`} value={variation.name} onChange={(event) => updateVariation(product, variation.id, { name: event.target.value })} placeholder={index === 0 ? 'Tamanho' : 'Cor'} className={fieldClasses} />
                    </FormField>
                    <FormField htmlFor={`${formId}-variation-values-${variation.id}`} label="Valores">
                      <TagInput
                        id={`${formId}-variation-values-${variation.id}`}
                        tags={variation.options}
                        onChange={(options) => updateVariationOptions(product, variation.id, options)}
                        placeholder="Digite um valor e pressione Enter"
                      />
                    </FormField>
                    <Action onClick={() => removeVariation(product, variation.id)} icon="trash-solid" size="small" variant="neutral-adaptive" className="col-span-2 justify-self-end px-3 py-2">Remover variação</Action>
                  </div>
                ))}
              </div>
              <Action onClick={() => addVariation(product)} icon="plus-circle-solid" size="small" variant="primary-adaptive" className="mt-3 px-3">Nova Variação</Action>

              <div className="mt-4 border-t border-cinza-medio pt-3 dark:border-cinza-claro">
                <label htmlFor={`${formId}-measurement-kind-${product.id}`} className="text-sm font-medium">Guia de medidas</label>
                <TextField
                  as="select"
                  id={`${formId}-measurement-kind-${product.id}`}
                  value={guideKind}
                  onChange={(event) => {
                    const kind = event.target.value as MeasurementGuideKind
                    setMeasurementGuideKinds((current) => ({ ...current, [product.id]: kind }))
                    if (kind === 'none') {
                      updateProduct(product.id, { measurementGuide: undefined })
                      return
                    }
                    if (kind === 'image') {
                      updateProduct(product.id, { measurementGuide: product.measurementGuide?.kind === 'image' ? product.measurementGuide : undefined })
                      return
                    }
                    const sourceVariation = product.variations.find((variation) => variation.options.length > 0)
                    const nextTable = sourceVariation
                      ? resizeMeasurementTable(tableGuide, sourceVariation.options.map((option) => option.name), sourceVariation.id)
                      : tableGuide
                    updateProduct(product.id, { measurementGuide: { kind: 'table', table: nextTable } })
                  }}
                  className={`${fieldClasses} mt-1`}
                >
                  <option value="none">Sem guia</option>
                  <option value="table">Tabela manual</option>
                  <option value="image">Imagem</option>
                </TextField>
                {product.measurementGuide?.kind === 'table' && (
                  <div className="mt-3 grid gap-3">
                    <label htmlFor={`${formId}-measurement-variation-${product.id}`} className="text-sm font-medium">
                      Variação usada na tabela
                    </label>
                    <TextField
                      as="select"
                      id={`${formId}-measurement-variation-${product.id}`}
                      value={selectedMeasurementVariationId}
                      onChange={(event) => {
                        const variation = product.variations.find((item) => item.id === event.target.value)
                        if (!variation) return
                        updateProduct(product.id, {
                          measurementGuide: {
                            kind: 'table',
                            table: resizeMeasurementTable(tableGuide, variation.options.map((option) => option.name), variation.id),
                          },
                        })
                      }}
                      className={fieldClasses}
                    >
                      <option value="">Selecione uma variação</option>
                      {product.variations.filter((variation) => variation.options.length > 0).map((variation) => (
                        <option key={variation.id} value={variation.id}>
                          {variation.name || 'Variação sem nome'} ({variation.options.map((option) => option.name).join(', ')})
                        </option>
                      ))}
                    </TextField>
                    {product.variations.every((variation) => variation.options.length === 0) && (
                      <p className="text-sm">Adicione antes uma variação e transforme seus valores em tags.</p>
                    )}
                    {tableGuide.sizes.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-max border-separate border-spacing-2">
                          <thead>
                            <tr>
                              <th className="text-left text-sm font-medium">Medida</th>
                              {tableGuide.sizes.map((size) => <th key={size} className="text-left text-sm font-medium">{size}</th>)}
                              <th><span className="sr-only">Ações</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableRows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                <td>
                                  <TextField
                                    id={`${formId}-measurement-label-${product.id}-${rowIndex}`}
                                    value={row.label}
                                    onChange={(event) => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sections: [{ title: 'Medidas', rows: tableRows.map((item, index) => index === rowIndex ? { ...item, label: event.target.value } : item) }] } } })}
                                    placeholder="Ex: Busto"
                                    className={`${fieldClasses} min-w-32`}
                                  />
                                </td>
                                {tableGuide.sizes.map((size, valueIndex) => (
                                  <td key={size}>
                                    <TextField
                                      id={`${formId}-measurement-value-${product.id}-${rowIndex}-${valueIndex}`}
                                      value={row.values[valueIndex] ?? ''}
                                      onChange={(event) => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sections: [{ title: 'Medidas', rows: tableRows.map((item, index) => index === rowIndex ? { ...item, values: tableGuide.sizes.map((_, itemValueIndex) => itemValueIndex === valueIndex ? event.target.value : item.values[itemValueIndex] ?? '') } : item) }] } } })}
                                      aria-label={`${row.label || 'Medida'} para ${size}`}
                                      className={`${fieldClasses} min-w-20`}
                                    />
                                  </td>
                                ))}
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sections: [{ title: 'Medidas', rows: tableRows.filter((_, index) => index !== rowIndex) }] } } })}
                                    aria-label={`Remover medida ${row.label || rowIndex + 1}`}
                                    className="rounded-full p-2 hover:bg-cinza-claro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca dark:hover:bg-cinza-medio"
                                  >
                                    <Icon name="trash-solid" className="size-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {tableGuide.sizes.length > 0 && (
                      <Action
                        id={`${formId}-measurement-add-${product.id}`}
                        onClick={() => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sections: [{ title: 'Medidas', rows: [...tableRows, { label: '', values: tableGuide.sizes.map(() => '') }] }] } } })}
                        icon="plus-circle-solid"
                        size="small"
                        variant="neutral-adaptive"
                        className="justify-self-start px-3"
                      >
                        Adicionar medida
                      </Action>
                    )}
                  </div>
                )}
                <input id={`${formId}-measurement-${product.id}`} type="file" accept={ACCEPTED_UPLOAD_IMAGE_TYPES.join(',')} onChange={(event) => void handleMeasurementImage(product, event.target.files?.[0])} className="sr-only" />
                {guideKind === 'image' && (
                  <Action id={`${formId}-measurement-upload-${product.id}`} onClick={() => document.getElementById(`${formId}-measurement-${product.id}`)?.click()} icon="upload" size="small" variant="neutral-adaptive" className="mt-3 px-3">{product.measurementGuide?.kind === 'image' ? 'Trocar imagem' : 'Enviar imagem'}</Action>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )

  const raffleSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Detalhes - Rifa</h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <FormField htmlFor={`${formId}-raffle-total`} label="Quantidade de números*">
          <TextField
            id={`${formId}-raffle-total`}
            inputMode="numeric"
            value={draft.raffleTotalNumbers}
            onChange={(changeEvent) => setField('raffleTotalNumbers', changeEvent.target.value)}
            required={draft.kind === 'raffle'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-raffle-price`} label="Valor por número (R$)*">
          <TextField
            id={`${formId}-raffle-price`}
            inputMode="decimal"
            value={draft.raffleNumberPrice}
            onChange={(changeEvent) => setField('raffleNumberPrice', formatCurrencyInput(changeEvent.target.value))}
            placeholder="0,00"
            required={draft.kind === 'raffle'}
            className={fieldClasses}
          />
        </FormField>
        <div />
      </div>
      <div id={`${formId}-prizes`} tabIndex={-1} className="mt-4">
        <h4 className={`${isPanel ? 'text-base' : 'text-2xl'} font-medium`}>Prêmios</h4>
        <div className="mt-3 flex flex-wrap gap-4">
          {draft.prizes.map((prize, prizeIndex) => (
            <div key={prize.id} className={isPanel ? 'w-20' : 'w-32'}>
              <div className="relative aspect-square overflow-hidden rounded-2xl">
                <ImagePlaceholder label={`Sem foto de ${prize.name || 'prêmio'}`} className="h-full w-full" />
                <img src={prize.image.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <p className="mt-1 truncate text-sm">{prize.name}</p>
              <Action
                onClick={() => openPrizeDialog(prize)}
                icon="edit-pencil"
                size="small"
                variant="neutral-adaptive"
                className="mt-2 px-3"
              >
                Editar
              </Action>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  disabled={prizeIndex === 0}
                  onClick={() => {
                    const prizes = [...draft.prizes]
                    ;[prizes[prizeIndex - 1], prizes[prizeIndex]] = [prizes[prizeIndex], prizes[prizeIndex - 1]]
                    setField('prizes', prizes)
                  }}
                  aria-label={`Mover ${prize.name} para cima`}
                  className="rounded-lg bg-cinza-medio px-2 py-1 text-xs text-cinza-claro enabled:hover:bg-cinza-escuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={prizeIndex === draft.prizes.length - 1}
                  onClick={() => {
                    const prizes = [...draft.prizes]
                    ;[prizes[prizeIndex], prizes[prizeIndex + 1]] = [prizes[prizeIndex + 1], prizes[prizeIndex]]
                    setField('prizes', prizes)
                  }}
                  aria-label={`Mover ${prize.name} para baixo`}
                  className="rounded-lg bg-cinza-medio px-2 py-1 text-xs text-cinza-claro enabled:hover:bg-cinza-escuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-30"
                >
                  →
                </button>
              </div>
              <button type="button" onClick={() => setField('prizes', draft.prizes.filter((item) => item.id !== prize.id))} className="mt-1 w-full rounded text-xs underline hover:text-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca">Remover</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => openPrizeDialog()}
            className={`${isPanel ? 'w-20' : 'w-32'} group flex flex-col gap-2 rounded-lg text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca`}
          >
            <span className="flex aspect-square w-full items-center justify-center rounded-2xl bg-cinza-medio text-cinza-escuro group-hover:bg-cinza-escuro group-hover:text-cinza-claro">
              <Icon name="plus-circle-solid" className="size-10" />
            </span>
            <span>Adicionar prêmio</span>
          </button>
        </div>
      </div>
    </section>
  )

  const pixPreview = draft.paymentKey.trim() && draft.paymentReceiver.trim() && draft.city.trim()
    ? createPixCode(draft.paymentKey, draft.paymentReceiver, draft.city)
    : ''
  const paymentSection = (
    <section className={sectionClasses}>
      <h3 className={sectionTitleClasses}>Pagamento</h3>
      <p className="mt-1 text-xs text-cinza-medio dark:text-cinza-claro">
        Chave, recebedor e cidade são obrigatórios para publicar. O Pix copia-e-cola é gerado a partir deles, já com o valor de cada reserva.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <FormField htmlFor={`${formId}-payment-key`} label="Chave PIX" wide>
          <TextField
            id={`${formId}-payment-key`}
            value={draft.paymentKey}
            onChange={(changeEvent) => setField('paymentKey', changeEvent.target.value)}
            required={event?.status === 'active'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-receiver`} label="Nome do recebedor">
          <TextField
            id={`${formId}-receiver`}
            value={draft.paymentReceiver}
            onChange={(changeEvent) => setField('paymentReceiver', changeEvent.target.value)}
            maxLength={25}
            required={event?.status === 'active'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-city`} label="Cidade do recebedor">
          <TextField
            id={`${formId}-city`}
            value={draft.city}
            onChange={(changeEvent) => setField('city', changeEvent.target.value)}
            maxLength={15}
            required={event?.status === 'active'}
            className={fieldClasses}
          />
        </FormField>
        {pixPreview && (
          <p className="col-span-2 rounded-lg bg-cinza-claro px-3 py-2 text-xs break-all text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
            <span className="font-medium">Pix copia-e-cola (sem valor):</span> {pixPreview}
          </p>
        )}
        <FormField htmlFor={`${formId}-instructions`} label="Instruções pós-pagamento" wide>
          <TextField
            id={`${formId}-instructions`}
            value={draft.postPaymentInstructions}
            onChange={(changeEvent) => setField('postPaymentInstructions', changeEvent.target.value)}
            placeholder="Ex: envie o comprovante para o número (99) 99999-8888"
            required
            className={fieldClasses}
          />
        </FormField>
        <details className="col-span-2">
          <summary className="cursor-pointer text-sm font-medium">
            Link externo dos comprovantes (opcional)
          </summary>
          <TextField
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
      formId={formId}
      layout={layout}
      onProcessingChange={setIsCompressing}
      photos={photos}
      setPhotos={(value) => {
        setSaveError('')
        setPhotos(value)
      }}
      subjectLabel={event?.title || draft.title || 'evento'}
      title={draft.kind === 'raffle' ? 'Imagens do Evento' : 'Imagens'}
    />
  )

  const buttonsRow = (
    <div className="mt-5">
      {saveError && (
        <p role="alert" aria-live="polite" className="sticky bottom-3 z-10 mb-3 rounded-xl bg-marca-clara p-3 text-sm font-medium text-marca-escura shadow-lg">
          {saveError}
        </p>
      )}
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
          disabled={isCompressing || isPrizeCompressing || isSaving}
          className="min-w-0 flex-1"
        >
          {isSaving ? 'Salvando...' : 'Salvar Evento'}
        </Action>
      </div>
    </div>
  )

  const detailsSection = draft.kind === 'product' ? productSection : raffleSection
  const prizeDialog = (
    <Dialog
      ariaLabel={editingPrizeId ? 'Editar prêmio' : 'Adicionar prêmio'}
      onClose={() => setIsPrizeDialogOpen(false)}
      className="w-full max-w-[30rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised"
    >
      <h2 className="text-3xl font-medium text-marca">
        {editingPrizeId ? 'Editar Prêmio' : 'Adicionar Prêmio'}
      </h2>
      <h3 className="mt-2 text-2xl font-medium">Prêmio da rifa</h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-40 overflow-hidden rounded-3xl">
          {prizePhoto
            ? <img src={prizePhoto.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <ImagePlaceholder label="Prêmio sem foto" className="h-full w-full" />}
        </div>
        <div className="flex flex-col gap-3">
          <Action
            onClick={() => {
              document.getElementById(`${formId}-prize-image`)?.click()
            }}
            disabled={isPrizeCompressing}
            icon="edit-pencil"
            size="small"
            variant="neutral-adaptive"
            className="px-4 py-2"
          >
            Editar
          </Action>
          <Action
            onClick={() => setPrizePhoto(null)}
            icon="trash-solid"
            size="small"
            variant="neutral-adaptive"
            className="px-4 py-2"
          >
            Remover
          </Action>
        </div>
      </div>
      <input
        id={`${formId}-prize-image`}
        type="file"
        accept={ACCEPTED_UPLOAD_IMAGE_TYPES.join(',')}
        disabled={isPrizeCompressing}
        onChange={handlePrizeImage}
        className="sr-only"
      />
      {isPrizeCompressing && <p role="status" className="mt-2 text-sm">Processando imagem...</p>}
      <label htmlFor={`${formId}-prize-name`} className="mt-5 block font-medium">
        Nome do Prêmio
      </label>
      <TextField
        id={`${formId}-prize-name`}
        value={prizeDraft}
        onChange={(changeEvent) => setPrizeDraft(changeEvent.target.value)}
        className={`${fieldClasses} mt-1`}
      />
      <div className="mt-5 flex gap-4">
        <Action onClick={() => setIsPrizeDialogOpen(false)} size="small" variant="secondary-adaptive" className="w-24 shrink-0">
          Cancelar
        </Action>
        <Action
          onClick={savePrize}
          disabled={!prizeDraft.trim() || !prizePhoto || isPrizeCompressing}
          size="small"
          variant="primary-adaptive"
          className="min-w-0 flex-1"
        >
          Salvar Prêmio
        </Action>
      </div>
    </Dialog>
  )

  if (isPanel) {
    return (
      <>
        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-[14rem_minmax(0,1fr)] items-start gap-6">
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
        {isPrizeDialogOpen && prizeDialog}
        {confirmVerification && <ConfirmationDialog title="Confirmar verificação" description="Confirme que todas as informações do evento foram verificadas antes de salvar." onCancel={() => setConfirmVerification(false)} onConfirm={() => void saveVerified()} />}
      </>
    )
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit}>
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
      {isPrizeDialogOpen && prizeDialog}
      {confirmVerification && <ConfirmationDialog title="Confirmar verificação" description="Confirme que todas as informações do evento foram verificadas antes de salvar." onCancel={() => setConfirmVerification(false)} onConfirm={() => void saveVerified()} />}
    </>
  )
})
