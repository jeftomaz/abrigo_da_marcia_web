export type DogGender = 'macho' | 'femea'
export type DogSize = 'pequeno' | 'medio' | 'grande'
export type DogStatus = 'disponivel' | 'adotado' | 'falecido'

export type Dog = {
  id: string
  name: string
  gender: DogGender
  size: DogSize
  birthYear: number
  description: string
  status: DogStatus
  // Temporário: hoje o catálogo público usa um único link global (GOOGLE_FORM_URL em
  // apps/public). Campo por cão ainda não existe em `caes` (DATA_MODEL.md) — ver PROGRESS.md.
  adoptionFormUrl: string
  featured: boolean
  photos: string[]
}

export const DEFAULT_ADOPTION_FORM_URL = 'https://forms.gle/nLSjXJyeLGUJXZj27'

export const STATUS_LABELS: Record<DogStatus, string> = {
  disponivel: 'Disponível',
  adotado: 'Adotado',
  falecido: 'Falecido',
}

const DESCRIPTION =
  'Doguinho é um cachorro animado e querido por todo o abrigo, recém-chegado. Ele gosta de correr e brincar com os outros cães.'

export const SEED_DOGS: Dog[] = [
  {
    id: '1',
    name: 'Negão',
    gender: 'macho',
    size: 'grande',
    birthYear: 2019,
    description: DESCRIPTION,
    status: 'disponivel',
    adoptionFormUrl: DEFAULT_ADOPTION_FORM_URL,
    featured: true,
    photos: ['foto-1', 'foto-2', 'foto-3'],
  },
  {
    id: '2',
    name: 'Dentinho de Leite da Silva',
    gender: 'macho',
    size: 'medio',
    birthYear: 2022,
    description: DESCRIPTION,
    status: 'disponivel',
    adoptionFormUrl: DEFAULT_ADOPTION_FORM_URL,
    featured: false,
    photos: ['foto-1', 'foto-2'],
  },
  {
    id: '3',
    name: 'Aquadog',
    gender: 'femea',
    size: 'grande',
    birthYear: 2018,
    description: DESCRIPTION,
    status: 'adotado',
    adoptionFormUrl: DEFAULT_ADOPTION_FORM_URL,
    featured: false,
    photos: ['foto-1'],
  },
]
