import { Hero } from '../components/Hero'
import { NossosCuidados } from '../components/NossosCuidados'
import { AdocaoPreview } from '../components/AdocaoPreview'
import { HistoriasPreview } from '../components/HistoriasPreview'
import { RecaopensaPreview } from '../components/RecaopensaPreview'
import { Doacao } from '../components/Doacao'
import { SobreNos } from '../components/SobreNos'
import { Voluntarios } from '../components/Voluntarios'

export function Landing() {
  return (
    <main>
      <Hero />
      <AdocaoPreview />
      <HistoriasPreview />
      <RecaopensaPreview />
      <NossosCuidados />
      <Doacao />
      <SobreNos />
      <Voluntarios />
    </main>
  )
}
