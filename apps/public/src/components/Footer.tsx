import { Icon, Logo, usePublicSocialLinks } from '@abrigo/shared'

export function Footer() {
  const { data: socialLinks } = usePublicSocialLinks()

  return (
    <footer id="footer" className="bg-black text-white">
      <div className="mx-auto grid max-w-5xl grid-cols-2 px-6 py-8 lg:min-h-52 lg:gap-8 lg:px-16 lg:pt-8 lg:pb-4">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:justify-between">
          <div className="col-start-1 row-start-1">
            <Logo className="h-10 w-auto lg:h-14" />
          </div>

          <address className="col-span-2 row-start-2 mt-8 flex flex-col gap-1.5 text-footer-copy not-italic lg:mt-6 lg:gap-2">
            <span className="flex items-center gap-2">
              <Icon name="map-pin" className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
              Ribeirão Preto, São Paulo, Brasil
            </span>
            <a className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" href="mailto:abrigodamarcia@gmail.com">
              <Icon name="mail-solid" className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
              <span className="min-w-0 break-all">abrigodamarcia@gmail.com</span>
            </a>
          </address>

          <small className="col-span-2 row-start-4 mt-4 text-footer-meta lg:mt-0">
            © {new Date().getFullYear()} Abrigo da Márcia
          </small>
        </div>

        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:items-end lg:justify-between lg:text-right">
          <div className="col-start-2 row-start-1 justify-self-end text-right">
            <p className="text-xl">Siga o abrigo</p>
            {(socialLinks?.facebook || socialLinks?.instagram) && (
              <div className="mt-3 flex justify-end gap-3 lg:mt-4 lg:gap-4">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                    <Icon name="facebook-tag" className="h-9 w-9 lg:h-14 lg:w-14" />
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                    <Icon name="instagram" className="h-9 w-9 lg:h-14 lg:w-14" />
                  </a>
                )}
              </div>
            )}
          </div>

          <small className="col-span-2 row-start-5 mt-1 text-footer-meta lg:mt-0">
            Criado por Ícaro Pavan e Jeferson Tomaz
          </small>
        </div>

        <div className="col-span-2 row-start-3 mt-8 border-t border-white/30 lg:hidden" aria-hidden="true" />
      </div>
    </footer>
  )
}
