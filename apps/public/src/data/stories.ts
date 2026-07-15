import historiasPhoto from '../assets/landing_historias.jpg'

export type Story = {
  description: string
  fullDescription: string
  id: number
  name: string
  photos: string[]
}

const DESCRIPTION =
  'Aqui vem o início de um texto descrevendo um cão ou um produto, depende do contexto'
const FULL_DESCRIPTION =
  'Aqui vem o texto completo, contando a história desde o resgate até a adoção. Este espaço reúne os principais momentos da recuperação, os cuidados recebidos no abrigo e a chegada ao novo lar, até que o conteúdo real de cada história esteja cadastrado.'
const PHOTOS = [historiasPhoto, historiasPhoto, historiasPhoto]
const STORY_NAMES = ['Maia', 'Clarinha', 'Moleque', 'Maia', 'Clarinha', 'Moleque']

export const STORIES: Story[] = STORY_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  description: DESCRIPTION,
  fullDescription: FULL_DESCRIPTION,
  photos: PHOTOS,
}))
