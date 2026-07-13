import { FeatureSection } from '@abrigo/shared'
import sobreNosPhoto from '../assets/landing_conheca.jpg'

export function SobreNos() {
  return (
    <FeatureSection
      id="sobre-nos"
      image={{
        src: sobreNosPhoto,
        alt: 'Cães resgatados no Abrigo da Márcia',
      }}
      layout="compact"
      contentClassName="lg:-translate-y-16"
      heading={
        <h2 className="text-5xl leading-tight font-medium text-marca-escura dark:text-marca-clara lg:text-8xl">
          Conheça o abrigo
        </h2>
      }
    >
      <div className="max-w-2xl space-y-4 text-2xl leading-tight lg:mt-8 lg:space-y-6">
        <p>
          O Abrigo da Márcia, fundado há mais de 20 anos, resgata cães
          abandonados em Ribeirão Preto, no estado de São Paulo.
        </p>
        <p>
          Iniciado pela própria Márcia e auxiliado com a ajuda de voluntários, o
          abrigo já oferece um lar, cuidado, amor e adoção responsável para mais
          de 120 cães, além de ter salvado incontáveis animais ao longo das
          últimas duas décadas.
        </p>
        <p>Hoje, é um lar temporário mantido por doações e apoio da comunidade.</p>
      </div>
    </FeatureSection>
  )
}
