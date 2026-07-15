import { useId, useState } from 'react'
import { Action, Dialog, ExpandedCardDialog, Icon, SelectField } from '@abrigo/shared'

type CartItem = {
  color: string
  fit: string
  id: string
  size: string
}

type ProductReservationFlowProps = {
  description: string
  image: string
  onClose: () => void
  title: string
}

type FlowStage = 'checkout' | 'confirmation' | 'measures' | 'product'

const UNIT_PRICE = 70
const BULK_PRICE = 60
const BULK_THRESHOLD = 2
const DEMO_PIX_CODE = 'PIX-DEMONSTRACAO-ABRIGO-DA-MARCIA'

const FEMALE_MEASURES = [
  ['Ombro', '34', '37', '40', '43', '44'],
  ['Altura', '55', '58', '64', '67', '70'],
  ['Busto', '41', '44', '47', '50', '52'],
  ['Cintura', '37', '40', '43', '46', '48'],
  ['Quadril', '44', '46', '49', '53', '55'],
]

const MALE_MEASURES = [
  ['Ombro', '42', '44', '45', '48', '50'],
  ['Altura', '68', '72', '75', '78', '80'],
  ['Largura', '48', '52', '55', '61', '64'],
]

const SIZES = ['P', 'M', 'G', 'GG', 'XG']

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

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

function MeasuresTable({ rows }: { rows: string[][] }) {
  return (
    <table className="w-full border-collapse text-center text-xs sm:text-sm">
      <thead>
        <tr>
          <th className="border border-current p-1" aria-label="Medida" />
          {SIZES.map((size) => (
            <th key={size} scope="col" className="border border-current p-1 font-medium underline">
              {size}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, ...values]) => (
          <tr key={label}>
            <th scope="row" className="border border-current p-1 font-medium underline">
              {label}
            </th>
            {values.map((value, index) => (
              <td key={`${label}-${SIZES[index]}`} className="border border-current p-1 underline">
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DemoPixQrCode() {
  const size = 29
  const finderOrigins = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]
  const isFinderArea = (x: number, y: number) =>
    finderOrigins.some(
      ([originX, originY]) =>
        x >= originX && x <= originX + 6 && y >= originY && y <= originY + 6,
    )
  const isFinderCell = (x: number, y: number) =>
    finderOrigins.some(([originX, originY]) => {
      const localX = x - originX
      const localY = y - originY
      if (localX < 0 || localX > 6 || localY < 0 || localY > 6) return false
      return (
        localX === 0 ||
        localX === 6 ||
        localY === 0 ||
        localY === 6 ||
        (localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4)
      )
    })

  return (
    <svg
      viewBox={`-2 -2 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="Ilustração de QR Code Pix demonstrativo"
      className="aspect-square w-full bg-white text-cinza-escuro"
    >
      <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="white" />
      {Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => {
          const finder = isFinderCell(x, y)
          const timing = (x === 7 || y === 7) && (x + y) % 2 === 0
          const data = ((x * 149 + y * 97) ^ ((x + y) * 53) ^ (x * y * 7)) % 17 < 8
          if ((!finder && isFinderArea(x, y)) || (!finder && !timing && !data)) return null
          return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
        }),
      )}
    </svg>
  )
}

export function ProductReservationFlow({
  description,
  image,
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
  const [customerName, setCustomerName] = useState('')
  const [contact, setContact] = useState('')
  const [pixCopied, setPixCopied] = useState(false)
  const checkoutTitleId = useId()
  const measuresTitleId = useId()
  const confirmationTitleId = useId()
  const canAdd = Boolean(color && fit && size)
  const canCheckout = Boolean(customerName.trim() && contact.trim())
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

  const copyPixCode = async () => {
    await navigator.clipboard.writeText(DEMO_PIX_CODE)
    setPixCopied(true)
  }

  if (stage === 'measures') {
    return (
      <Dialog
        ariaLabelledBy={measuresTitleId}
        onClose={() => setStage('product')}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-10"
      >
        <h2 id={measuresTitleId} className="text-3xl font-medium text-marca sm:text-4xl">
          Tabela de Medidas
        </h2>
        <section className="mt-4" aria-labelledby={`${measuresTitleId}-female`}>
          <h3 id={`${measuresTitleId}-female`} className="mb-2 text-2xl font-medium sm:text-3xl">
            Feminina
          </h3>
          <div className="overflow-x-auto">
            <MeasuresTable rows={FEMALE_MEASURES} />
          </div>
        </section>
        <section className="mt-5" aria-labelledby={`${measuresTitleId}-male`}>
          <h3 id={`${measuresTitleId}-male`} className="mb-2 text-2xl font-medium sm:text-3xl">
            Masculina
          </h3>
          <div className="overflow-x-auto">
            <MeasuresTable rows={MALE_MEASURES} />
          </div>
        </section>
        <Action onClick={() => setStage('product')} className="mt-8 flex w-full" size="small">
          Voltar
        </Action>
      </Dialog>
    )
  }

  if (stage === 'checkout') {
    return (
      <Dialog
        ariaLabelledBy={checkoutTitleId}
        onClose={() => setStage('product')}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-7 text-on-surface-raised sm:p-10"
      >
        <h2 id={checkoutTitleId} className="text-3xl font-medium text-marca sm:text-4xl">
          Produtos Escolhidos
        </h2>
        <section className="mt-4" aria-labelledby={`${checkoutTitleId}-items`}>
          <h3 id={`${checkoutTitleId}-items`} className="text-2xl font-medium">
            Itens
          </h3>
          <ul className="mt-1 space-y-1">
            {cart.map((item) => (
              <li key={item.id}>{itemLabel(item)}</li>
            ))}
          </ul>
        </section>
        <section className="mt-7" aria-labelledby={`${checkoutTitleId}-price`}>
          <h3 id={`${checkoutTitleId}-price`} className="text-2xl font-medium">
            Valor
          </h3>
          <PriceSummary count={cart.length} />
        </section>
        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault()
            if (canCheckout) setStage('confirmation')
          }}
        >
          <h3 className="text-2xl font-medium sm:text-3xl">Seus dados</h3>
          <label htmlFor="product-customer-name" className="mt-2 block">
            Nome completo
          </label>
          <input
            id="product-customer-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Ex.: João Maria da Silva"
            autoComplete="name"
            required
            className="mt-1 h-10 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
          />
          <label htmlFor="product-customer-contact" className="mt-5 block">
            Telefone ou e-mail
          </label>
          <input
            id="product-customer-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="(00) 98765-4321"
            autoComplete="email"
            required
            className="mt-1 h-10 w-full rounded-full bg-cinza-claro px-5 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
          />
          <p className="mt-3 text-xs">
            Esses dados serão utilizados apenas para registrar a reserva e entrar em contato, sendo
            removidos após o evento.
          </p>
          <div className="mt-6 flex gap-4">
            <Action
              onClick={() => setStage('product')}
              size="small"
              variant="secondary"
              className="w-24 shrink-0"
            >
              Voltar
            </Action>
            <Action type="submit" disabled={!canCheckout} size="small" className="min-w-0 flex-1">
              Finalizar sua reserva
            </Action>
          </div>
        </form>
      </Dialog>
    )
  }

  if (stage === 'confirmation') {
    return (
      <Dialog
        ariaLabelledBy={confirmationTitleId}
        onClose={onClose}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-surface-raised p-7 text-on-surface-raised sm:p-10"
      >
        <h2 id={confirmationTitleId} className="text-3xl font-medium text-marca sm:text-4xl">
          Reserva confirmada!
        </h2>
        <section className="mt-4" aria-labelledby={`${confirmationTitleId}-summary`}>
          <h3 id={`${confirmationTitleId}-summary`} className="text-2xl font-medium sm:text-3xl">
            Reserva
          </h3>
          <p>Modelos escolhidos: {cart.map((item) => `${item.fit} ${item.size}`).join(' + ')}</p>
          <p>Total: {formatCurrency(total)}</p>
        </section>
        <p className="mt-5 text-sm">
          Envie o comprovante para o Instagram @abrigodamarcia ou via WhatsApp para um voluntário.
        </p>
        <div className="mx-auto mt-6 w-4/5 max-w-72">
          <DemoPixQrCode />
          <Action onClick={copyPixCode} className="mt-3 flex w-full" size="small">
            {pixCopied ? 'Código copiado' : 'Copiar código PIX'}
          </Action>
        </div>
        <p className="mt-4 text-center text-xs text-marca">
          Código Pix demonstrativo até a integração da chave oficial.
        </p>
        <p className="mt-6 text-xs">
          A confirmação da reserva é feita manualmente pelos comprovantes recebidos.
        </p>
        <Action onClick={onClose} className="mt-8 flex w-full" size="small">
          Fechar
        </Action>
      </Dialog>
    )
  }

  return (
    <ExpandedCardDialog
      title={title}
      description={description}
      images={[image]}
      onClose={onClose}
      variant="product"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 lg:px-12 lg:pt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-3xl font-medium text-marca lg:text-4xl">{title}</h2>
            <Action
              onClick={() => setStage('measures')}
              size="small"
              variant="secondary"
              className="shrink-0"
            >
              Medidas
            </Action>
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

        <div className="m-6 mt-5 grid shrink-0 grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,1.35fr)] items-center gap-2 rounded-full bg-marca p-2 lg:m-5 lg:mt-4 lg:flex lg:gap-3">
          <Action
            onClick={onClose}
            size="small"
            variant="secondary-on-brand"
            className="w-full shrink-0 lg:w-24"
          >
            Cancelar
          </Action>
          <button
            type="button"
            disabled={cart.length === 0}
            aria-expanded={cartExpanded}
            onClick={() => setCartExpanded((expanded) => !expanded)}
            className="min-w-0 flex-1 cursor-pointer text-center text-xs leading-tight text-marca-clara disabled:cursor-default disabled:opacity-50 lg:text-sm"
          >
            <span className="block">
              {cart.length} {cart.length === 1 ? 'produto escolhido' : 'produtos escolhidos'}
            </span>
            <span className="block font-medium">{formatCurrency(total)}</span>
          </button>
          <Action
            onClick={() => setStage('checkout')}
            size="small"
            variant="primary-on-brand"
            disabled={cart.length === 0}
            className="min-w-0 w-full px-1 text-tag lg:w-44 lg:flex-none lg:px-3 lg:text-sm"
          >
            Finalizar sua reserva
          </Action>
        </div>
      </div>
    </ExpandedCardDialog>
  )
}
