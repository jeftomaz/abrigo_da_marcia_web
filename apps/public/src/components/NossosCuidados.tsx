import { Icon } from '@abrigo/shared'

type Care = {
  icon: string
  title: string
  description: string
  featured?: boolean
}

const CARES: Care[] = [
  {
    icon: 'syringe-solid-svgrepo-com',
    title: 'Vacinação Anual',
    description: 'Todos os animais possuem um ciclo anual de vacinação',
  },
  {
    icon: 'pet-bowl',
    title: 'Controle de alimentação',
    description:
      'Todos os animais possuem seus hábitos alimentares personalizados e regrados',
    featured: true,
  },
  {
    icon: 'bug-solid',
    title: 'Tratamento contra carrapatos',
    description: 'Todos os animais possuem um ciclo anual de vacinação',
  },
]

export function NossosCuidados() {
  return (
    <section className="bg-marca text-cinza-claro dark:text-cinza-escuro">
      <div className="mx-auto max-w-[1920px] px-6 py-12 lg:py-24">
        <div className="text-center">
          <h2 className="text-5xl leading-tight font-medium lg:text-8xl">
            Nossos cuidados
          </h2>
          <p className="mt-2 text-2xl">
            Cuidar da saúde de nosso cães é prioridade.
          </p>
        </div>

        <div className="mx-auto mt-12 flex max-w-5xl flex-col lg:mt-52 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8">
          {CARES.map(({ icon, title, description, featured }) => (
            <div
              key={title}
              className={`flex items-center gap-4 text-left lg:flex-col lg:gap-6 lg:text-center ${
                featured ? 'flex-row-reverse text-right lg:-mt-36' : ''
              }`}
            >
              <div
                className={`flex w-1/3 shrink-0 items-center justify-center rounded-[50%] bg-white dark:bg-marca-escura ${
                  featured
                    ? 'aspect-3/4 lg:h-96 lg:w-72'
                    : 'aspect-10/11 lg:h-80 lg:w-72'
                }`}
              >
                <Icon
                  name={icon}
                  className={`text-marca ${featured ? 'size-16 lg:size-40' : 'size-14 lg:size-36'}`}
                />
              </div>

              <div className="min-w-0 flex-1 lg:mx-auto lg:max-w-xs">
                <h3 className="text-2xl leading-tight font-medium lg:text-3xl">
                  {title}
                </h3>
                <p className="mt-2 text-base italic lg:text-lg lg:not-italic">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
