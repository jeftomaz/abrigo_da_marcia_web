import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mapAuditMetadata } from '../admin/audit'
import type { AuditMetadata } from '../admin/audit'
import type { Tables, TablesInsert } from '../database.types'
import {
  getStoredPhotoUrl,
  removeStoredPhotos,
  toEditablePhotos,
  uploadNewPhotos,
} from '../images/storagePhotos'
import type { EditablePhoto } from '../images/storagePhotos'
import { supabase } from '../supabase/client'

export type DogGender = 'macho' | 'femea'
export type DogSize = 'pequeno' | 'medio' | 'grande'
export type DogStatus = 'disponivel' | 'adotado' | 'falecido'

export type Dog = {
  audit: AuditMetadata | null
  id: string
  name: string
  gender: DogGender
  size: DogSize
  birthYear: number
  description: string
  status: DogStatus
  featured: boolean
  /** Override opcional do formulário de adoção; vazio usa o link global de Configurações. */
  adoptionFormUrl: string
  photos: string[]
}

export type DogPatch = { featured?: boolean; status?: DogStatus }

export type EditableDogPhoto = EditablePhoto

export type DogDraft = Omit<Dog, 'audit' | 'id' | 'photos'> & {
  id?: string
  photos: EditableDogPhoto[]
}

export const STATUS_LABELS: Record<DogStatus, string> = {
  disponivel: 'Disponível',
  adotado: 'Adotado',
  falecido: 'Falecido',
}

const adminDogsKey = ['dogs', 'admin'] as const
const publicDogsKey = ['dogs', 'public'] as const

function mapDog(row: Tables<'caes'>): Dog {
  return {
    audit: mapAuditMetadata(row),
    id: row.id,
    name: row.name,
    gender: row.gender,
    size: row.size,
    birthYear: row.birth_year,
    description: row.description,
    status: row.status,
    featured: row.featured,
    adoptionFormUrl: row.adoption_form_url ?? '',
    photos: row.photos,
  }
}

function mapPublicDog(row: Tables<'caes_public'>): Dog {
  if (
    !row.id ||
    !row.name ||
    !row.gender ||
    !row.size ||
    row.birth_year === null ||
    !row.description
  ) {
    throw new Error('O banco retornou um cão público incompleto.')
  }

  return {
    audit: null,
    id: row.id,
    name: row.name,
    gender: row.gender,
    size: row.size,
    birthYear: row.birth_year,
    description: row.description,
    status: 'disponivel',
    featured: row.featured ?? false,
    adoptionFormUrl: row.adoption_form_url ?? '',
    photos: row.photos ?? [],
  }
}

async function listAdminDogs() {
  const { data, error } = await supabase
    .from('caes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(mapDog)
}

async function listPublicDogs() {
  const { data, error } = await supabase.from('caes_public').select('*')

  if (error) throw error
  return data.map(mapPublicDog)
}

async function saveDog(draft: DogDraft) {
  const id = draft.id ?? crypto.randomUUID()
  let storedPaths: string[] = []
  if (draft.id) {
    const { data, error } = await supabase
      .from('caes')
      .select('photos')
      .eq('id', draft.id)
      .single()
    if (error) throw error
    storedPaths = data.photos
  }

  const uploadedPhotos = await uploadNewPhotos(id, draft.photos)
  const uploadedPaths = [...uploadedPhotos.values()]
  const photos = draft.photos.map((photo) => {
    const path = photo.path ?? uploadedPhotos.get(photo.key)
    if (!path) throw new Error('Uma imagem do cão não pôde ser preparada para envio.')
    return path
  })
  const values: TablesInsert<'caes'> = {
    id,
    name: draft.name,
    gender: draft.gender,
    size: draft.size,
    birth_year: draft.birthYear,
    description: draft.description,
    status: draft.status,
    featured: draft.featured,
    adoption_form_url: draft.adoptionFormUrl.trim() || null,
    photos,
  }

  const request = draft.id
    ? supabase.from('caes').update(values).eq('id', id).select().single()
    : supabase.from('caes').insert(values).select().single()
  const { data, error } = await request

  if (error) {
    await removeStoredPhotos(uploadedPaths).catch(() => undefined)
    throw error
  }

  const removedPaths = storedPaths.filter((path) => !photos.includes(path))
  await removeStoredPhotos(removedPaths)

  return mapDog(data)
}

async function updateDog({ id, ...changes }: DogPatch & { id: string }) {
  const { data, error } = await supabase
    .from('caes')
    .update(changes)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapDog(data)
}

async function deleteDog(dog: Dog) {
  const { error } = await supabase.from('caes').delete().eq('id', dog.id)
  if (error) throw error

  await removeStoredPhotos(dog.photos)
}

function useInvalidateDogs() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminDogsKey }),
      queryClient.invalidateQueries({ queryKey: publicDogsKey }),
    ])
}

export function useAdminDogs() {
  return useQuery({ queryKey: adminDogsKey, queryFn: listAdminDogs })
}

export function usePublicDogs() {
  return useQuery({
    queryKey: publicDogsKey,
    queryFn: listPublicDogs,
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useSaveDog() {
  const invalidate = useInvalidateDogs()
  return useMutation({ mutationFn: saveDog, onSuccess: invalidate })
}

export function useUpdateDog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDog,
    onMutate: async ({ id, ...changes }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: adminDogsKey }),
        queryClient.cancelQueries({ queryKey: publicDogsKey }),
      ])
      const previousAdminDogs = queryClient.getQueryData<Dog[]>(adminDogsKey)
      const previousPublicDogs = queryClient.getQueryData<Dog[]>(publicDogsKey)

      queryClient.setQueryData<Dog[]>(adminDogsKey, (dogs) =>
        dogs?.map((dog) => (dog.id === id ? { ...dog, ...changes } : dog)),
      )
      queryClient.setQueryData<Dog[]>(publicDogsKey, (dogs) =>
        changes.status && changes.status !== 'disponivel'
          ? dogs?.filter((dog) => dog.id !== id)
          : dogs?.map((dog) => (dog.id === id ? { ...dog, ...changes } : dog)),
      )

      return { previousAdminDogs, previousPublicDogs }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousAdminDogs) {
        queryClient.setQueryData(adminDogsKey, context.previousAdminDogs)
      }
      if (context?.previousPublicDogs) {
        queryClient.setQueryData(publicDogsKey, context.previousPublicDogs)
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminDogsKey }),
        queryClient.invalidateQueries({ queryKey: publicDogsKey }),
      ]),
  })
}

export function useDeleteDog() {
  const invalidate = useInvalidateDogs()
  return useMutation({ mutationFn: deleteDog, onSuccess: invalidate })
}

export function getDogPhotoUrl(path: string) {
  return getStoredPhotoUrl(path)
}

export function toEditableDogPhotos(dog: Dog | null): EditableDogPhoto[] {
  return toEditablePhotos(dog?.photos ?? [])
}
