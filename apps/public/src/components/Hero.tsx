import { useRef } from 'react'
import { BlobImage } from '@abrigo/shared'
import heroImage from '../assets/landing_abertura.jpg'

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  const scrollToNext = () => {
    const next = sectionRef.current?.nextElementSibling
    if (next) {
      next.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
    }
  }

  return (
    <section ref={sectionRef} className="bg-marca">
      <div className="mx-auto grid max-w-[1920px] gap-8 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-x-12 lg:py-24">
        <div className="lg:flex lg:flex-col lg:gap-4">
          <h1 className="text-5xl leading-tight font-medium text-marca-escura dark:text-marca-clara lg:text-8xl">
            Fazer o bem é
            <br />
            bom pra cachorro!
          </h1>

          <BlobImage
            src={heroImage}
            alt="Mão fazendo carinho em um cachorro"
            className="mx-auto my-8 w-full max-w-md lg:hidden"
          />

          <p className="max-w-4xl text-2xl text-marca-escura dark:text-marca-clara">
            No Abrigo da Márcia, nos dedicamos a cuidar e alimentar cães em
            situação de vulnerabilidade, oferecendo a eles um lar temporário
            seguro e cheio de amor.
          </p>
        </div>

        <BlobImage
          src={heroImage}
          alt="Mão fazendo carinho em um cachorro"
          className="hidden w-full lg:ml-auto lg:block"
        />

        <button
          type="button"
          onClick={scrollToNext}
          aria-label="Rolar para a próxima seção"
          className="flex justify-center text-marca-escura dark:text-marca-clara lg:hidden"
        >
          <ChevronDownIcon />
        </button>
      </div>
    </section>
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
