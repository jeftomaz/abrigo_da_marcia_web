import { useId, useState } from 'react'
import { Action, Dialog, ExpandedCardDialog, Icon, SelectField } from '@abrigo/shared'
import {
  ReservationCheckoutDialog,
  ReservationConfirmationDialog,
} from './ReservationDialogs'
import { ReservationBar } from './ReservationBar'
import { ReservationSummaryButton } from './ReservationSummaryButton'
import { formatCurrency } from './reservation'

type CartItem = {
  color: string
  fit: string
  id: string
  size: string
}

type ProductReservationFlowProps = {
  description: string
  image: string
  measurementGuide?: ProductMeasurementGuide
  onClose: () => void
  title: string
}

export type ProductMeasurementGuide =
  | {
      alt: string
      kind: 'image'
      src: string
    }
  | {
      kind: 'table'
      sections: {
        rows: { label: string; values: string[] }[]
        title: string
      }[]
      sizes: string[]
    }

type FlowStage = 'checkout' | 'confirmation' | 'measures' | 'product'

const UNIT_PRICE = 70
const BULK_PRICE = 60
const BULK_THRESHOLD = 2

const SIZES = ['P', 'M', 'G', 'GG', 'XG']

function itemLabel(item: CartItem) {
  return `Camiseta ${item.fit} ${item.size} — ${item.color}`
}

function PriceSummary({ count }: { count: number }) {
  const subtotal = count * UNIT_PRICE
  const total = count >= BULK_THRESHOLD ? count * BULK_PRICE : subtotal
  const discount = subtotal - total

  return (
    <div className="space-y-1">
      <p>Soma dos produtos: {formatCurrency(subtotal)}</p>
      {discount > 0 && <p className="text-marca">Desconto: - {formatCurrency(discount)}</p>}
      <p className="font-semibold">Total: {formatCurrency(total)}</p>
    </div>
  )
}

function MeasuresTable({
  rows,
  sizes,
}: {
  rows: { label: string; values: string[] }[]
  sizes: string[]
}) {
  return (
    <table className="w-full border-collapse text-center text-xs sm:text-sm">
      <thead>
        <tr>
          <th className="border border-current p-1" aria-label="Medida" />
          {sizes.map((size) => (
            <th key={size} scope="col" className="border border-current p-1 font-medium underline">
              {size}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ label, values }) => (
          <tr key={label}>
            <th scope="row" className="border border-current p-1 font-medium underline">
              {label}
            </th>
            {values.map((value, index) => (
              <td key={`${label}-${sizes[index]}`} className="border border-current p-1 underline">
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ProductReservationFlow({
  description,
  image,
  measurementGuide,
  onClose,
  title,
}: ProductReservationFlowProps) {
  const [stage, setStage] = useState<FlowStage>('product')
  const [color, setColor] = useState('')
  const [fit, setFit] = useState('')
  const [size, setSize] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartExpanded, setCartExpanded] = useState(false)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const measuresTitleId = useId()
  const canAdd = Boolean(color && fit && size)
  const subtotal = cart.length * UNIT_PRICE
  const total = cart.length >= BULK_THRESHOLD ? cart.length * BULK_PRICE : subtotal

  const addProduct = () => {
    if (!canAdd) return
    setCart((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        color,
        fit,
        size,
      },
    ])
    setColor('')
    setFit('')
    setSize('')
  }

  const measuresDialog = stage === 'measures' ? (
    <Dialog
      ariaLabelledBy={measuresTitleId}
      onClose={() => setStage('product')}
      className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-10"
    >
      <h2 id={measuresTitleId} className="text-3xl font-medium text-marca sm:text-4xl">
        Tabela de Medidas
      </h2>
      {measurementGuide?.kind === 'table' &&
        measurementGuide.sections.map((section, index) => (
          <section
            key={section.title}
            className="mt-5"
            aria-labelledby={`${measuresTitleId}-section-${index}`}
          >
            <h3
              id={`${measuresTitleId}-section-${index}`}
              className="mb-2 text-2xl font-medium sm:text-3xl"
            >
              {section.title}
            </h3>
            <div className="overflow-x-auto">
              <MeasuresTable rows={section.rows} sizes={measurementGuide.sizes} />
            </div>
          </section>
        ))}
      {measurementGuide?.kind === 'image' && (
        <img
          src={measurementGuide.src}
          alt={measurementGuide.alt}
          className="mt-5 max-h-[65vh] w-full object-contain"
        />
      )}
      <Action onClick={() => setStage('product')} className="mt-8 flex w-full" size="small">
        Voltar
      </Action>
    </Dialog>
  ) : null

  const checkoutDialog = stage === 'checkout' || stage === 'confirmation' ? (
    <ReservationCheckoutDialog
      active={stage === 'checkout'}
      title="Produtos Escolhidos"
      onBack={() => setStage('product')}
      onConfirm={() => setStage('confirmation')}
    >
      <section className="mt-4">
        <h3 className="text-2xl font-medium">Itens</h3>
        <ul className="mt-1 space-y-1">
          {cart.map((item) => (
            <li key={item.id}>{itemLabel(item)}</li>
          ))}
        </ul>
      </section>
      <section className="mt-7">
        <h3 className="text-2xl font-medium">Valor</h3>
        <PriceSummary count={cart.length} />
      </section>
    </ReservationCheckoutDialog>
  ) : null

  const confirmationDialog = stage === 'confirmation' ? (
    <ReservationConfirmationDialog onClose={onClose}>
      <section className="mt-4">
        <h3 className="text-2xl font-medium sm:text-3xl">Reserva</h3>
        <p>Modelos escolhidos: {cart.map((item) => `${item.fit} ${item.size}`).join(' + ')}</p>
        <p>Total: {formatCurrency(total)}</p>
      </section>
    </ReservationConfirmationDialog>
  ) : null

  return (
    <>
      <ExpandedCardDialog
        active={stage === 'product'}
        title={title}
        description={description}
        images={[image]}
        onClose={onClose}
        persistentClose
        variant="product"
      >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 lg:px-12 lg:pt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-medium text-marca lg:text-4xl">{title}</h2>
            {measurementGuide && (
              <Action
                onClick={() => setStage('measures')}
                size="small"
                variant="secondary"
                className="shrink-0 lg:mr-20"
              >
                Medidas
              </Action>
            )}
          </div>

          <p
            className={`mt-5 text-center text-base leading-normal lg:mt-10 lg:text-justify ${descriptionExpanded ? '' : 'line-clamp-3 lg:line-clamp-none'}`}
          >
            {description}
          </p>
          <button
            type="button"
            className="mx-auto mt-2 block cursor-pointer text-sm underline underline-offset-2 lg:hidden"
            onClick={() => setDescriptionExpanded((expanded) => !expanded)}
          >
            {descriptionExpanded ? 'Mostrar menos' : 'Ler descrição completa'}
          </button>

          <div className="mt-6 grid grid-cols-3 gap-3 lg:mt-10 lg:gap-8">
            <SelectField
              id="product-size"
              accessibleLabel="Selecionar tamanho"
              label="Selecionar"
              value={size}
              onChange={setSize}
              variant="product"
            >
              <option value="">Tamanho</option>
              {SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="product-color"
              accessibleLabel="Selecionar cor"
              label="Selecionar"
              value={color}
              onChange={setColor}
              className="order-3 lg:order-2"
              variant="product"
            >
              <option value="">Cor</option>
              <option value="Verde">Verde</option>
              <option value="Amarela">Amarela</option>
            </SelectField>
            <SelectField
              id="product-fit"
              accessibleLabel="Selecionar caimento"
              label="Selecionar"
              value={fit}
              onChange={setFit}
              className="order-2 lg:order-3"
              variant="product"
            >
              <option value="">Caimento</option>
              <option value="Padrão">Padrão</option>
              <option value="Baby Look">Baby Look</option>
            </SelectField>
          </div>

          <Action
            onClick={addProduct}
            disabled={!canAdd}
            size="small"
            className="mx-auto mt-6 flex w-44"
          >
            Adicionar produto
          </Action>

          {cartExpanded && cart.length > 0 && (
            <ul className="mt-5 space-y-2 rounded-2xl bg-cinza-claro p-3 text-sm text-cinza-escuro">
              {cart.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span>{itemLabel(item)}</span>
                  <button
                    type="button"
                    onClick={() => setCart((items) => items.filter(({ id }) => id !== item.id))}
                    aria-label={`Remover ${itemLabel(item)}`}
                    className="shrink-0 text-marca"
                  >
                    <Icon name="trash-solid" className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ReservationBar
          className="m-6 mt-5 shrink-0 lg:m-5 lg:mt-4"
          secondaryLabel="Cancelar"
          onSecondary={onClose}
          onFinish={() => setStage('checkout')}
          finishDisabled={cart.length === 0}
        >
          <ReservationSummaryButton
            count={cart.length}
            expanded={cartExpanded}
            singularLabel="produto escolhido"
            pluralLabel="produtos escolhidos"
            onToggle={() => setCartExpanded((expanded) => !expanded)}
            total={total}
          />
        </ReservationBar>
      </div>
      </ExpandedCardDialog>
      {measuresDialog}
      {checkoutDialog}
      {confirmationDialog}
    </>
  )
}
