import { Action, FeatureSection } from '@abrigo/shared'
import voluntariosPhoto from '../assets/landing_voluntario.jpg'

export function Voluntarios() {
  return (
    <FeatureSection
      id="voluntarios"
      tone="neutral"
      imagePosition="start"
      image={{
        src: voluntariosPhoto,
        alt: 'Voluntários reunidos no Abrigo da Márcia',
        className: 'max-w-xs lg:max-w-none lg:justify-self-start',
      }}
      contentClassName="text-center lg:text-right"
      heading={
        <h2 className="text-3xl leading-tight font-medium text-marca lg:text-8xl">
          Seja um voluntário
        </h2>
      }
    >
      <div className="mt-8 space-y-6 text-right text-2xl leading-tight lg:space-y-8 lg:text-right">
        <p>Não pode adotar um cão nem doar agora? Faça parte do abrigo!</p>
        <p>
          Há diversas formas de ajudar a cuidar do abrigo: limpeza, auxílio em
          campanhas de arrecadação, participação nas redes sociais e muito mais.
        </p>
        <p>
          Você pode ajudar o abrigo da sua maneira e deixar a vida dos nossos
          cães cada vez melhor.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Action icon="user-love" size="compact" className="py-2">
          Ser um voluntário
        </Action>
      </div>
    </FeatureSection>
  )
}
