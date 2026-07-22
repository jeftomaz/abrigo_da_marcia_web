import { useId, useMemo, useState } from 'react'
import {
  Action,
  Dialog,
  ExpandedCardDialog,
  Icon,
  SelectField,
  getEventPhotoUrl,
  parseCurrencyToCents,
  useReserveProducts,
} from '@abrigo/shared'
import type {
  EventProduct,
  FundraisingEvent,
  ProductMeasurementGuide,
  ReservationResult,
} from '@abrigo/shared'
import { ReservationCheckoutDialog, ReservationConfirmationDialog } from './ReservationDialogs'
import { ReservationBar } from './ReservationBar'
import { ReservationSummaryButton } from './ReservationSummaryButton'
import { formatCurrency } from './reservation'

type CartItem = {
  id: string
  options: Record<string, string>
  productId: string
}

type ProductReservationFlowProps = {
  event: FundraisingEvent
  onClose: () => void
}

type FlowStage = 'checkout' | 'confirmation' | 'measures' | 'product'

function itemPrice(product: EventProduct, productCount: number) {
  const discountMinimum = Number(product.discountMinimum)
  return discountMinimum > 0 && productCount >= discountMinimum
    ? parseCurrencyToCents(product.discountPrice)
    : parseCurrencyToCents(product.price)
}

function itemLabel(item: CartItem, products: EventProduct[]) {
  const product = products.find((candidate) => candidate.id === item.productId)
  if (!product) return 'Produto'
  const options = product.variations
    .map((variation) => variation.options.find((option) => option.id === item.options[variation.id])?.name)
    .filter(Boolean)
  return [product.name, ...options].join(' — ')
}

function MeasuresTable({ guide }: { guide: Extract<ProductMeasurementGuide, { kind: 'table' }> }) {
  return guide.table.sections.map((section, sectionIndex) => (
    <section key={`${section.title}-${sectionIndex}`} className="mt-5">
      <h3 className="mb-2 text-2xl font-medium sm:text-3xl">{section.title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center text-xs sm:text-sm">
          <thead>
            <tr>
              <th className="border border-current p-1" aria-label="Medida" />
              {guide.table.sizes.map((size) => <th key={size} className="border border-current p-1 font-medium">{size}</th>)}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr key={row.label}>
                <th className="border border-current p-1 font-medium">{row.label}</th>
                {row.values.map((value, index) => <td key={`${row.label}-${index}`} className="border border-current p-1">{value}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  ))
}

export function ProductReservationFlow({ event, onClose }: ProductReservationFlowProps) {
  const [stage, setStage] = useState<FlowStage>('product')
  const [selectedProductId, setSelectedProductId] = useState(event.products[0]?.id ?? '')
  const [selection, setSelection] = useState<Record<string, string>>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartExpanded, setCartExpanded] = useState(false)
  const [result, setResult] = useState<ReservationResult | null>(null)
  const measuresTitleId = useId()
  const reserveMutation = useReserveProducts()
  const product = event.products.find((item) => item.id === selectedProductId) ?? event.products[0]
  const maxItems = Number(event.maxItemsPerReservation) || Number.POSITIVE_INFINITY
  const reservable = event.status === 'active'
  const canAdd = Boolean(
    reservable &&
    product &&
    cart.length < maxItems &&
    product.variations.every((variation) => selection[variation.id]),
  )
  const totalCents = useMemo(() => cart.reduce((total, item) => {
    const itemProduct = event.products.find((candidate) => candidate.id === item.productId)
    if (!itemProduct) return total
    const productCount = cart.filter((candidate) => candidate.productId === item.productId).length
    return total + itemPrice(itemProduct, productCount)
  }, 0), [cart, event.products])

  if (!product) return null

  const addProduct = () => {
    if (!canAdd) return
    setCart((items) => [...items, { id: crypto.randomUUID(), productId: product.id, options: selection }])
    setSelection({})
  }

  const measuresDialog = stage === 'measures' && product.measurementGuide ? (
    <Dialog
      ariaLabelledBy={measuresTitleId}
      onClose={() => setStage('product')}
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-10"
    >
      <h2 id={measuresTitleId} className="text-3xl font-medium text-marca sm:text-4xl">Guia de Medidas</h2>
      {product.measurementGuide.kind === 'table' ? (
        <MeasuresTable guide={product.measurementGuide} />
      ) : (
        <img src={getEventPhotoUrl(product.measurementGuide.path)} alt={`Guia de medidas de ${product.name}`} className="mt-5 max-h-[65vh] w-full object-contain" />
      )}
      <Action onClick={() => setStage('product')} className="mt-8 flex w-full" size="small">Voltar</Action>
    </Dialog>
  ) : null

  const checkoutDialog = stage === 'checkout' || stage === 'confirmation' ? (
    <ReservationCheckoutDialog
      active={stage === 'checkout'}
      title="Produtos Escolhidos"
      onBack={() => setStage('product')}
      isSubmitting={reserveMutation.isPending}
      error={reserveMutation.error instanceof Error ? reserveMutation.error.message : undefined}
      onConfirm={async (customer) => {
        const reservation = await reserveMutation.mutateAsync({
          eventId: event.id,
          ...customer,
          items: cart.map(({ productId, options }) => ({ productId, options })),
        })
        setResult(reservation)
        setStage('confirmation')
      }}
    >
      <section className="mt-4">
        <h3 className="text-2xl font-medium">Itens</h3>
        <ul className="mt-1 space-y-1">{cart.map((item) => <li key={item.id}>{itemLabel(item, event.products)}</li>)}</ul>
      </section>
      <section className="mt-7">
        <h3 className="text-2xl font-medium">Valor</h3>
        <p className="font-semibold">Total: {formatCurrency(totalCents / 100)}</p>
      </section>
    </ReservationCheckoutDialog>
  ) : null

  const confirmationDialog = stage === 'confirmation' && result ? (
    <ReservationConfirmationDialog
      expiresAt={result.expiresAt}
      pixCode={result.pixCode}
      postPaymentInstructions={result.postPaymentInstructions}
      onClose={onClose}
    >
      <section className="mt-4">
        <h3 className="text-2xl font-medium sm:text-3xl">Reserva</h3>
        <p>{cart.length} {cart.length === 1 ? 'produto escolhido' : 'produtos escolhidos'}</p>
        <p>Total: {formatCurrency(result.totalCents / 100)}</p>
      </section>
    </ReservationConfirmationDialog>
  ) : null

  const images = (product.gallery.length ? product.gallery : event.gallery).map(getEventPhotoUrl)

  return (
    <>
      <ExpandedCardDialog
        active={stage === 'product'}
        title={product.name}
        description={product.description}
        images={images}
        onClose={onClose}
        persistentClose
        variant="product"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 lg:px-12 lg:pt-10">
            {event.products.length > 1 && (
              <div className="mb-5 flex gap-2 overflow-x-auto pb-2" aria-label="Produtos do evento">
                {event.products.map((item) => (
                  <Action
                    key={item.id}
                    onClick={() => { setSelectedProductId(item.id); setSelection({}) }}
                    aria-pressed={item.id === product.id}
                    size="small"
                    variant={item.id === product.id ? 'primary' : 'secondary'}
                    className="shrink-0 px-4"
                  >
                    {item.name}
                  </Action>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-3xl font-medium text-marca lg:text-4xl">{product.name}</h2>
              {product.measurementGuide && <Action onClick={() => setStage('measures')} size="small" variant="secondary" className="shrink-0">Medidas</Action>}
            </div>
            <p className="mt-5 text-base leading-normal lg:mt-8">{product.description}</p>
            <p className="mt-4 text-center text-xl font-medium text-marca">{formatCurrency(parseCurrencyToCents(product.price) / 100)}</p>

            {reservable ? (
              <>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:mt-8 lg:grid-cols-3">
                  {product.variations.map((variation) => (
                    <SelectField
                      key={variation.id}
                      id={`product-${product.id}-${variation.id}`}
                      accessibleLabel={`Selecionar ${variation.name}`}
                      label="Selecionar"
                      value={selection[variation.id] ?? ''}
                      onChange={(value) => setSelection((current) => ({ ...current, [variation.id]: value }))}
                      variant="product"
                    >
                      <option value="">{variation.name}</option>
                      {variation.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </SelectField>
                  ))}
                </div>
                <Action onClick={addProduct} disabled={!canAdd} size="small" className="mx-auto mt-6 flex w-44">Adicionar produto</Action>
              </>
            ) : (
              <p className="mt-8 rounded-2xl bg-cinza-claro p-4 text-center text-cinza-escuro dark:bg-cinza-medio dark:text-cinza-claro">Este evento já foi encerrado.</p>
            )}

            {cartExpanded && cart.length > 0 && (
              <ul className="mt-5 space-y-2 rounded-2xl bg-cinza-claro p-3 text-sm text-cinza-escuro">
                {cart.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3">
                    <span>{itemLabel(item, event.products)}</span>
                    <button type="button" onClick={() => setCart((items) => items.filter(({ id }) => id !== item.id))} aria-label={`Remover ${itemLabel(item, event.products)}`} className="shrink-0 text-marca"><Icon name="trash-solid" className="size-5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {reservable && (
            <ReservationBar className="m-6 mt-5 shrink-0 lg:m-5 lg:mt-4" secondaryLabel="Cancelar" onSecondary={onClose} onFinish={() => setStage('checkout')} finishDisabled={cart.length === 0}>
              <ReservationSummaryButton count={cart.length} expanded={cartExpanded} singularLabel="produto escolhido" pluralLabel="produtos escolhidos" onToggle={() => setCartExpanded((expanded) => !expanded)} total={totalCents / 100} />
            </ReservationBar>
          )}
        </div>
      </ExpandedCardDialog>
      {measuresDialog}
      {checkoutDialog}
      {confirmationDialog}
    </>
  )
}

export type { ProductMeasurementGuide }
