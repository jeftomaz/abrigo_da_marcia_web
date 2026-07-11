import { Hero } from '../components/Hero'
import { AdocaoPreview } from '../components/AdocaoPreview'
import { HistoriasPreview } from '../components/HistoriasPreview'

export function Landing() {
  return (
    <main>
      <Hero />
      <AdocaoPreview />
      <HistoriasPreview />
    </main>
  )
}
