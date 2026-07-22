import { useEffect, useId, useRef, useState } from 'react'
import { ACCEPTED_UPLOAD_IMAGE_TYPES, Action, Dialog, Icon, compressImage } from '@abrigo/shared'
import type { EditablePhoto } from '@abrigo/shared'
import type { EditableEventProduct, EditableRafflePrize, EventDraft, EventKind, FundraisingEvent } from '../events/events'
import { toEditableEventPhotos, toEditableProduct, toEditableRafflePrizes } from '../events/events'
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
    pixCode: '',
    postPaymentInstructions: '',
    receiptFolderUrl: '',
  }
}

function hasInvalidMeasurementGuide(product: EditableEventProduct) {
  const guide = product.measurementGuide
  return guide?.kind === 'table' && (
    guide.table.sizes.length === 0 ||
    guide.table.sections.some((section) =>
      !section.title.trim() || section.rows.length === 0 || section.rows.some((row) =>
        !row.label.trim() || row.values.length !== guide.table.sizes.length || row.values.some((value) => !value.trim()),
      ),
    )
  )
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
  const initial: EventDraft = event
    ? {
        ...event,
        gallery: toEditableEventPhotos(event),
        prizes: toEditableRafflePrizes(event),
        products: event.products.map(toEditableProduct),
      }
    : emptyEvent()
  const [draft, setDraft] = useState<EventDraft>(initial)
  const [photos, setPhotos] = useState(() => initial.gallery)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isPrizeDialogOpen, setIsPrizeDialogOpen] = useState(false)
  const [editingPrizeId, setEditingPrizeId] = useState<string | null>(null)
  const [prizeDraft, setPrizeDraft] = useState('')
  const [prizePhoto, setPrizePhoto] = useState<EditablePhoto | null>(null)
  const [isPrizeCompressing, setIsPrizeCompressing] = useState(false)
  const createdPrizeUrls = useRef(new Set<string>())
  const isPanel = layout === 'panel'
  const fieldClasses = `${isPanel ? 'h-8 px-3 text-sm' : 'h-11 px-4'} w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 focus-visible:border-marca dark:border-cinza-claro dark:placeholder:text-cinza-claro/50`
  const sectionClasses = 'border-t border-cinza-medio pt-3 dark:border-cinza-claro'
  const sectionTitleClasses = `${isPanel ? 'text-xl' : 'text-3xl'} font-medium`

  useEffect(() => () => {
    createdPrizeUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const setField = <Key extends keyof typeof draft>(key: Key, value: (typeof draft)[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateProduct = (id: string, changes: Partial<EditableEventProduct>) => {
    setField('products', draft.products.map((product) => product.id === id ? { ...product, ...changes } : product))
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
    updateProduct(
      product.id,
      { variations: product.variations.map((variation) =>
        variation.id === id ? { ...variation, ...changes } : variation,
      ) },
    )
  }

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    if (!draft.title.trim() || !draft.description.trim()) return
    if (draft.kind === 'raffle' && draft.prizes.length === 0) {
      setSaveError('Adicione ao menos um prêmio à rifa.')
      return
    }
    if (photos.length === 0) {
      setSaveError('Adicione ao menos uma imagem.')
      return
    }
    const invalidProduct = draft.kind === 'product' && (
      draft.products.length === 0 || draft.products.some((product) =>
        !product.name.trim() || !product.description.trim() || !product.price || product.gallery.length === 0 ||
        product.variations.some((variation) => !variation.name.trim() || variation.options.length === 0 || variation.options.some((option) => !option.name.trim())) ||
        Boolean(product.discountPrice) !== Boolean(product.discountMinimum) ||
        hasInvalidMeasurementGuide(product)
      )
    )
    if (invalidProduct) {
      setSaveError('Preencha os dados, imagem, preço e opções de cada produto.')
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
    } catch {
      setSaveError('Não foi possível salvar o evento.')
    } finally {
      setIsSaving(false)
    }
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
      <div className="mt-3 grid grid-cols-2 gap-3 desk:grid-cols-5">
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
        <FormField htmlFor={`${formId}-max-items`} label="Máx. por reserva">
          <input
            id={`${formId}-max-items`}
            inputMode="numeric"
            value={draft.maxItemsPerReservation}
            onChange={(changeEvent) => setField('maxItemsPerReservation', changeEvent.target.value)}
            placeholder="Padrão"
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-ttl`} label="Expiração (min)">
          <input
            id={`${formId}-ttl`}
            inputMode="numeric"
            value={draft.reservationTtlMinutes}
            onChange={(changeEvent) => setField('reservationTtlMinutes', changeEvent.target.value)}
            placeholder="Padrão"
            className={fieldClasses}
          />
        </FormField>
      </div>
    </section>
  )

  const productSection = (
    <section className={sectionClasses}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={sectionTitleClasses}>Catálogo de Produtos</h3>
        <Action onClick={() => setField('products', [...draft.products, emptyProduct()])} icon="plus-circle-solid" size="small" variant="primary-adaptive" className="px-3">Novo Produto</Action>
      </div>
      <div className="mt-3 space-y-4">
        {draft.products.map((product, productIndex) => {
          const tableGuide = product.measurementGuide?.kind === 'table' ? product.measurementGuide.table : { sizes: [], sections: [{ title: 'Medidas', rows: [] }] }
          const tableRows = tableGuide.sections[0]?.rows ?? []
          return (
            <article key={product.id} className="rounded-2xl bg-cinza-claro p-4 text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-lg font-medium">Produto {productIndex + 1}</h4>
                {draft.products.length > 1 && <Action onClick={() => setField('products', draft.products.filter((item) => item.id !== product.id))} icon="trash-solid" size="small" variant="neutral-adaptive" className="px-3">Remover</Action>}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <FormField htmlFor={`${formId}-product-name-${product.id}`} label="Nome*">
                  <input id={`${formId}-product-name-${product.id}`} value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} required className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-product-price-${product.id}`} label="Preço (R$)*">
                  <input id={`${formId}-product-price-${product.id}`} inputMode="decimal" value={product.price} onChange={(event) => updateProduct(product.id, { price: event.target.value })} required className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-product-description-${product.id}`} label="Descrição*" wide>
                  <textarea id={`${formId}-product-description-${product.id}`} value={product.description} onChange={(event) => updateProduct(product.id, { description: event.target.value })} required rows={2} className={`${fieldClasses} h-auto resize-y py-2`} />
                </FormField>
                <FormField htmlFor={`${formId}-discount-price-${product.id}`} label="Preço com desconto">
                  <input id={`${formId}-discount-price-${product.id}`} inputMode="decimal" value={product.discountPrice} onChange={(event) => updateProduct(product.id, { discountPrice: event.target.value })} className={fieldClasses} />
                </FormField>
                <FormField htmlFor={`${formId}-discount-minimum-${product.id}`} label="Qtd. mínima p/ desconto">
                  <input id={`${formId}-discount-minimum-${product.id}`} inputMode="numeric" value={product.discountMinimum} onChange={(event) => updateProduct(product.id, { discountMinimum: event.target.value })} className={fieldClasses} />
                </FormField>
              </div>

              <PhotoGalleryField
                density="compact"
                formId={`${formId}-product-${product.id}`}
                layout={layout}
                onProcessingChange={setIsCompressing}
                photos={product.gallery}
                setPhotos={(value) => updateProduct(product.id, { gallery: typeof value === 'function' ? value(product.gallery) : value })}
                subjectLabel={product.name || `produto ${productIndex + 1}`}
                title="Imagens do Produto"
              />

              <div className="mt-4 space-y-3">
                {product.variations.map((variation, index) => (
                  <div key={variation.id} className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-raised p-3 text-on-surface-raised">
                    <FormField htmlFor={`${formId}-variation-${variation.id}`} label="Nome da variação">
                      <input id={`${formId}-variation-${variation.id}`} value={variation.name} onChange={(event) => updateVariation(product, variation.id, { name: event.target.value })} placeholder={index === 0 ? 'Tamanho' : 'Cor'} className={fieldClasses} />
                    </FormField>
                    <FormField htmlFor={`${formId}-variation-values-${variation.id}`} label="Valores">
                      <input
                        id={`${formId}-variation-values-${variation.id}`}
                        value={variation.options.map((option) => option.name).join(', ')}
                        onChange={(event) => {
                          const names = event.target.value.split(',').map((name) => name.trimStart())
                          updateVariation(product, variation.id, { options: names.map((name, optionIndex) => ({ id: variation.options[optionIndex]?.id ?? crypto.randomUUID(), name })) })
                        }}
                        placeholder="P, M, G"
                        className={fieldClasses}
                      />
                    </FormField>
                    <Action onClick={() => updateProduct(product.id, { variations: product.variations.filter((item) => item.id !== variation.id) })} icon="trash-solid" size="small" variant="neutral-adaptive" className="col-span-2 justify-self-end px-3 py-2">Remover opção</Action>
                  </div>
                ))}
              </div>
              <Action onClick={() => addVariation(product)} icon="plus-circle-solid" size="small" variant="primary-adaptive" className="mt-3 px-3">Nova Opção</Action>

              <div className="mt-4 border-t border-cinza-medio pt-3 dark:border-cinza-claro">
                <label className="text-sm font-medium">Guia de medidas</label>
                <select
                  value={product.measurementGuide?.kind ?? 'none'}
                  onChange={(event) => updateProduct(product.id, { measurementGuide: event.target.value === 'table' ? { kind: 'table', table: { sizes: [], sections: [{ title: 'Medidas', rows: [] }] } } : undefined })}
                  className={`${fieldClasses} mt-1`}
                >
                  <option value="none">Sem guia</option>
                  <option value="table">Tabela manual</option>
                  <option value="image">Imagem</option>
                </select>
                {product.measurementGuide?.kind === 'table' && (
                  <div className="mt-3 grid gap-3">
                    <input
                      value={tableGuide.sizes.join(', ')}
                      onChange={(event) => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sizes: event.target.value.split(',').map((value) => value.trim()) } } })}
                      aria-label="Tamanhos da tabela"
                      placeholder="Tamanhos: P, M, G"
                      className={fieldClasses}
                    />
                    <textarea
                      value={tableRows.map((row) => `${row.label}: ${row.values.join(', ')}`).join('\n')}
                      onChange={(event) => updateProduct(product.id, { measurementGuide: { kind: 'table', table: { ...tableGuide, sections: [{ title: 'Medidas', rows: event.target.value.split('\n').filter(Boolean).map((line) => { const [label, values = ''] = line.split(':'); return { label: label.trim(), values: values.split(',').map((value) => value.trim()) } }) }] } } })}
                      aria-label="Linhas da tabela de medidas"
                      placeholder={'Busto: 80, 90, 100\nAltura: 60, 65, 70'}
                      rows={3}
                      className={`${fieldClasses} h-auto resize-y py-2`}
                    />
                  </div>
                )}
                <input id={`${formId}-measurement-${product.id}`} type="file" accept={ACCEPTED_UPLOAD_IMAGE_TYPES.join(',')} onChange={(event) => void handleMeasurementImage(product, event.target.files?.[0])} className="sr-only" />
                {(product.measurementGuide?.kind === 'image' || product.measurementGuide === undefined) && (
                  <Action onClick={() => document.getElementById(`${formId}-measurement-${product.id}`)?.click()} icon="upload" size="small" variant="neutral-adaptive" className="mt-3 px-3">{product.measurementGuide?.kind === 'image' ? 'Trocar imagem' : 'Enviar imagem'}</Action>
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
        <div />
      </div>
      <div className="mt-4">
        <h4 className={`${isPanel ? 'text-base' : 'text-2xl'} font-medium`}>Prêmios</h4>
        <div className="mt-3 flex flex-wrap gap-4">
          {draft.prizes.map((prize, prizeIndex) => (
            <div key={prize.id} className={isPanel ? 'w-20' : 'w-32'}>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-cinza-claro dark:bg-cinza-medio">
                <Icon name="pata" className="absolute top-1/2 left-1/2 size-9 -translate-1/2 text-cinza-medio dark:text-cinza-claro" />
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
                  className="rounded-lg bg-cinza-medio px-2 py-1 text-xs text-cinza-claro disabled:opacity-30"
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
                  className="rounded-lg bg-cinza-medio px-2 py-1 text-xs text-cinza-claro disabled:opacity-30"
                >
                  →
                </button>
              </div>
              <button type="button" onClick={() => setField('prizes', draft.prizes.filter((item) => item.id !== prize.id))} className="mt-1 w-full text-xs underline">Remover</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => openPrizeDialog()}
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
            required={event?.status === 'active'}
            className={fieldClasses}
          />
        </FormField>
        <FormField htmlFor={`${formId}-instructions`} label="Instruções pós-pagamento" wide>
          <input
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
      <h3 className="mt-2 text-2xl font-medium">Seção</h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative size-40 overflow-hidden rounded-3xl bg-cinza-claro dark:bg-cinza-medio">
          <Icon name="pata" className="absolute top-1/2 left-1/2 size-10 -translate-1/2 text-cinza-medio dark:text-cinza-claro" />
          {prizePhoto && <img src={prizePhoto.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
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
      <input
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
        {isPrizeDialogOpen && prizeDialog}
      </>
    )
  }

  return (
    <>
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
      {isPrizeDialogOpen && prizeDialog}
    </>
  )
}
