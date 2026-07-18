import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../database.types'
import { supabase } from '../supabase/client'

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
  adoptionFormUrl: string
  featured: boolean
  photos: string[]
}

export type EditableDogPhoto = {
  key: string
  path?: string
  previewUrl: string
  file?: File
}

export type DogDraft = Omit<Dog, 'id' | 'photos'> & {
  id?: string
  photos: EditableDogPhoto[]
}

export const STATUS_LABELS: Record<DogStatus, string> = {
  disponivel: 'Disponível',
  adotado: 'Adotado',
  falecido: 'Falecido',
}

export const DEFAULT_ADOPTION_FORM_URL = 'https://forms.gle/nLSjXJyeLGUJXZj27'

const DOG_PHOTOS_BUCKET = 'dog-photos'
const adminDogsKey = ['dogs', 'admin'] as const
const publicDogsKey = ['dogs', 'public'] as const

function mapDog(row: Tables<'caes'>): Dog {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    size: row.size,
    birthYear: row.birth_year,
    description: row.description,
    status: row.status,
    adoptionFormUrl: row.adoption_form_url,
    featured: row.featured,
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
    !row.description ||
    !row.adoption_form_url
  ) {
    throw new Error('O banco retornou um cão público incompleto.')
  }

  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    size: row.size,
    birthYear: row.birth_year,
    description: row.description,
    status: 'disponivel',
    adoptionFormUrl: row.adoption_form_url,
    featured: row.featured ?? false,
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

function getPhotoExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

async function uploadNewPhotos(dogId: string, photos: EditableDogPhoto[]) {
  const uploadedPhotos = new Map<string, string>()

  try {
    for (const photo of photos) {
      if (!photo.file) continue
      const path = `${dogId}/${crypto.randomUUID()}.${getPhotoExtension(photo.file)}`
      const { error } = await supabase.storage.from(DOG_PHOTOS_BUCKET).upload(path, photo.file, {
        contentType: photo.file.type,
        upsert: false,
      })
      if (error) throw error
      uploadedPhotos.set(photo.key, path)
    }
    return uploadedPhotos
  } catch (error) {
    const uploadedPaths = [...uploadedPhotos.values()]
    if (uploadedPaths.length) {
      await supabase.storage.from(DOG_PHOTOS_BUCKET).remove(uploadedPaths)
    }
    throw error
  }
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
    adoption_form_url: draft.adoptionFormUrl,
    featured: draft.featured,
    photos,
  }

  const request = draft.id
    ? supabase.from('caes').update(values).eq('id', id).select().single()
    : supabase.from('caes').insert(values).select().single()
  const { data, error } = await request

  if (error) {
    if (uploadedPaths.length) {
      await supabase.storage.from(DOG_PHOTOS_BUCKET).remove(uploadedPaths)
    }
    throw error
  }

  const removedPaths = storedPaths.filter((path) => !photos.includes(path))
  if (removedPaths.length) {
    await supabase.storage.from(DOG_PHOTOS_BUCKET).remove(removedPaths)
  }

  return mapDog(data)
}

async function updateDogStatus({ id, status }: { id: string; status: DogStatus }) {
  const { data, error } = await supabase
    .from('caes')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapDog(data)
}

async function deleteDog(dog: Dog) {
  const { error } = await supabase.from('caes').delete().eq('id', dog.id)
  if (error) throw error

  if (dog.photos.length) {
    await supabase.storage.from(DOG_PHOTOS_BUCKET).remove(dog.photos)
  }
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

export function useUpdateDogStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateDogStatus,
    onMutate: async ({ id, status }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: adminDogsKey }),
        queryClient.cancelQueries({ queryKey: publicDogsKey }),
      ])
      const previousAdminDogs = queryClient.getQueryData<Dog[]>(adminDogsKey)
      const previousPublicDogs = queryClient.getQueryData<Dog[]>(publicDogsKey)

      queryClient.setQueryData<Dog[]>(adminDogsKey, (dogs) =>
        dogs?.map((dog) => (dog.id === id ? { ...dog, status } : dog)),
      )
      queryClient.setQueryData<Dog[]>(publicDogsKey, (dogs) =>
        status === 'disponivel'
          ? dogs
          : dogs?.filter((dog) => dog.id !== id),
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
  if (/^(blob:|data:|https?:\/\/|\/)/.test(path)) return path
  return supabase.storage.from(DOG_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl
}

export function toEditableDogPhotos(dog: Dog | null): EditableDogPhoto[] {
  return (
    dog?.photos.map((path) => ({
      key: path,
      path,
      previewUrl: getDogPhotoUrl(path),
    })) ?? []
  )
}
