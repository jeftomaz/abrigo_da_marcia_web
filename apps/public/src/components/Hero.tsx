import { FeatureSection } from '@abrigo/shared'
import heroImage from '../assets/landing_abertura.jpg'

export function Hero() {
  const scrollToNext = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = event.currentTarget.closest('section')?.nextElementSibling
    if (next) {
      next.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
    }
  }

  return (
    <FeatureSection
      image={{ src: heroImage, alt: 'Mão fazendo carinho em um cachorro' }}
      contentClassName="lg:flex lg:flex-col lg:gap-4"
      heading={
        <h1 className="text-5xl leading-tight font-medium lg:text-8xl">
          Fazer o bem é
          <br />
          bom pra cachorro!
        </h1>
      }
    >
      <p className="max-w-4xl text-2xl">
        No Abrigo da Márcia, nos dedicamos a cuidar e alimentar cães em
        situação de vulnerabilidade, oferecendo a eles um lar temporário
        seguro e cheio de amor.
      </p>

      <button
        type="button"
        onClick={scrollToNext}
        aria-label="Rolar para a próxima seção"
        className="mt-8 flex w-full justify-center lg:hidden"
      >
        <ChevronDownIcon />
      </button>
    </FeatureSection>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-8 w-8"
      aria-hidden="true"
    >
      <path d="M6,9L12,15L18,9" />
    </svg>
  )
}
