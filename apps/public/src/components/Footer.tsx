import { Icon, Logo } from '@abrigo/shared'

export function Footer() {
  return (
    <footer id="footer" className="bg-black text-white">
      <div className="mx-auto grid min-h-24 max-w-5xl grid-cols-2 gap-8 py-4 pr-8 pl-11 lg:min-h-52 lg:px-16 lg:pt-8 lg:pb-4">
        <div className="flex min-w-0 flex-col justify-between">
          <div>
            <Logo className="h-6 w-auto lg:h-12" />

            <address className="mt-5 flex flex-col gap-1.5 text-tag not-italic lg:mt-6 lg:gap-2 lg:text-xs">
              <span className="flex items-center gap-2">
                <Icon name="map-pin" className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
                Ribeirão Preto, São Paulo, Brasil
              </span>
              <a className="flex items-center gap-2" href="mailto:abrigodamarcia@gmail.com">
                <Icon name="mail-solid" className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
                abrigodamarcia@gmail.com
              </a>
            </address>
          </div>

          <small className="text-tag lg:text-xs">® 2026 Abrigo da Márcia</small>
        </div>

        <div className="flex min-w-0 flex-col items-end justify-between text-right">
          <div>
            <p className="text-xs lg:text-xl">Siga o abrigo</p>
            <div className="mt-3 flex justify-end gap-3 lg:mt-4 lg:gap-4">
              <span role="img" aria-label="Facebook">
                <Icon name="facebook-tag" className="h-6 w-6 lg:h-12 lg:w-12" />
              </span>
              <span role="img" aria-label="Instagram">
                <Icon name="instagram" className="h-6 w-6 lg:h-12 lg:w-12" />
              </span>
            </div>
          </div>

          <small className="text-tag lg:text-xs">Criado por Ícaro Pavan e Jeferson Tomaz</small>
        </div>
      </div>
    </footer>
  )
}
