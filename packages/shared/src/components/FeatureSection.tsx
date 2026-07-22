import type { ReactNode } from 'react'
import { BlobImage } from './BlobImage'

type FeatureSectionImagePosition = 'end' | 'start'
type FeatureSectionLayout = 'compact' | 'default'
type FeatureSectionTone = 'brand' | 'contrast' | 'neutral'

const NEUTRAL_TONE_CLASSES =
  'bg-cinza-claro text-cinza-escuro dark:bg-cinza-escuro dark:text-cinza-claro'

type FeatureSectionProps = {
  after?: ReactNode
  children: ReactNode
  contentClassName?: string
  heading: ReactNode
  id?: string
  image: {
    alt: string
    className?: string
    src: string
  }
  imagePosition?: FeatureSectionImagePosition
  layout?: FeatureSectionLayout
  tone?: FeatureSectionTone
}

const TONE_CLASSES: Record<FeatureSectionTone, string> = {
  brand: 'bg-marca text-on-brand',
  contrast: NEUTRAL_TONE_CLASSES,
  neutral: NEUTRAL_TONE_CLASSES,
}

const LAYOUT_CLASSES: Record<
  FeatureSectionLayout,
  { container: string; desktopImage: string; mobileImage: string }
> = {
  default: {
    container:
      'gap-8 px-10 py-12 lg:gap-x-12 lg:px-6 lg:py-24',
    desktopImage: 'hidden w-11/12 justify-self-end lg:block',
    mobileImage: 'mx-auto my-8 w-full max-w-md lg:hidden',
  },
  compact: {
    container:
      'gap-0 px-10 py-12 lg:gap-x-12 lg:px-6 lg:py-12',
    desktopImage: 'hidden w-11/12 justify-self-end lg:block',
    mobileImage: 'mx-auto mt-6 mb-4 w-full max-w-md lg:hidden',
  },
}

export function FeatureSection({
  after,
  children,
  contentClassName = '',
  heading,
  id,
  image,
  imagePosition = 'end',
  layout = 'default',
  tone = 'brand',
}: FeatureSectionProps) {
  const layoutClasses = LAYOUT_CLASSES[layout]
  const contentSideClass =
    imagePosition === 'end' ? 'lg:pl-24' : 'lg:pr-24'
  const desktopImage = (
    <BlobImage
      src={image.src}
      alt={image.alt}
      aspect={layout === 'compact' ? 'portrait' : 'square'}
      className={`${layoutClasses.desktopImage} ${image.className ?? ''}`}
    />
  )

  return (
    <section id={id} className={TONE_CLASSES[tone]}>
      <div
        className={`mx-auto grid max-w-[1920px] lg:grid-cols-2 lg:items-center ${layoutClasses.container}`}
      >
        {imagePosition === 'start' && desktopImage}

        <div className={`${contentSideClass} ${contentClassName}`}>
          {heading}

          <BlobImage
            src={image.src}
            alt={image.alt}
            aspect={layout === 'compact' ? 'portrait' : 'square'}
            className={`${layoutClasses.mobileImage} ${image.className ?? ''}`}
          />

          {children}
        </div>

        {imagePosition === 'end' && desktopImage}
      </div>

      {after}
    </section>
  )
}
