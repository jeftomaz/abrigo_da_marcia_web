import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Tables, TablesInsert } from '../database.types'
import {
  getStoredPhotoUrl,
  removeStoredPhotos,
  toEditablePhotos,
  uploadNewPhotos,
} from '../images/storagePhotos'
import type { EditablePhoto } from '../images/storagePhotos'
import { supabase } from '../supabase/client'

export type Story = {
  id: string
  name: string
  description: string
  photos: string[]
  published: boolean
}

export type StoryDraft = Omit<Story, 'id' | 'photos'> & {
  id?: string
  photos: EditablePhoto[]
}

export type EditableStoryPhoto = EditablePhoto

const adminStoriesKey = ['stories', 'admin'] as const
const publicStoriesKey = ['stories', 'public'] as const

function mapStory(row: Tables<'historias'>): Story {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    photos: row.photos,
    published: row.published,
  }
}

function mapPublicStory(row: Tables<'historias_public'>): Story {
  if (!row.id || !row.name || !row.description || !row.photos) {
    throw new Error('O banco retornou uma história pública incompleta.')
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    photos: row.photos,
    published: true,
  }
}

async function listAdminStories() {
  const { data, error } = await supabase
    .from('historias')
    .select('*')
    .order('published', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data.map(mapStory)
}

async function listPublicStories() {
  const { data, error } = await supabase.from('historias_public').select('*')

  if (error) throw error
  return data.map(mapPublicStory)
}

async function saveStory(draft: StoryDraft) {
  const id = draft.id ?? crypto.randomUUID()
  let storedPaths: string[] = []

  if (draft.id) {
    const { data, error } = await supabase
      .from('historias')
      .select('photos')
      .eq('id', draft.id)
      .single()
    if (error) throw error
    storedPaths = data.photos
  }

  const uploadedPhotos = await uploadNewPhotos(`historias/${id}`, draft.photos)
  const uploadedPaths = [...uploadedPhotos.values()]
  const photos = draft.photos.map((photo) => {
    const path = photo.path ?? uploadedPhotos.get(photo.key)
    if (!path) throw new Error('Uma imagem da história não pôde ser preparada para envio.')
    return path
  })
  const values: TablesInsert<'historias'> = {
    id,
    name: draft.name,
    description: draft.description,
    photos,
    published: draft.published,
  }
  const request = draft.id
    ? supabase.from('historias').update(values).eq('id', id).select().single()
    : supabase.from('historias').insert(values).select().single()
  const { data, error } = await request

  if (error) {
    await removeStoredPhotos(uploadedPaths).catch(() => undefined)
    throw error
  }

  await removeStoredPhotos(storedPaths.filter((path) => !photos.includes(path)))
  return mapStory(data)
}

async function deleteStory(story: Story) {
  const { error } = await supabase.from('historias').delete().eq('id', story.id)
  if (error) throw error
  await removeStoredPhotos(story.photos)
}

async function updateStoryPublished({ id, published }: { id: string; published: boolean }) {
  const { data, error } = await supabase
    .from('historias')
    .update({ published })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapStory(data)
}

function useInvalidateStories() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminStoriesKey }),
      queryClient.invalidateQueries({ queryKey: publicStoriesKey }),
    ])
}

export function useAdminStories() {
  return useQuery({ queryKey: adminStoriesKey, queryFn: listAdminStories })
}

export function usePublicStories() {
  return useQuery({
    queryKey: publicStoriesKey,
    queryFn: listPublicStories,
    refetchInterval: 5_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useSaveStory() {
  const invalidate = useInvalidateStories()
  return useMutation({ mutationFn: saveStory, onSuccess: invalidate })
}

export function useDeleteStory() {
  const invalidate = useInvalidateStories()
  return useMutation({ mutationFn: deleteStory, onSuccess: invalidate })
}

export function useUpdateStoryPublished() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStoryPublished,
    onMutate: async ({ id, published }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: adminStoriesKey }),
        queryClient.cancelQueries({ queryKey: publicStoriesKey }),
      ])
      const previousStories = queryClient.getQueryData<Story[]>(adminStoriesKey)
      const previousPublicStories = queryClient.getQueryData<Story[]>(publicStoriesKey)
      queryClient.setQueryData<Story[]>(adminStoriesKey, (stories) =>
        stories?.map((story) => (story.id === id ? { ...story, published } : story)),
      )
      queryClient.setQueryData<Story[]>(publicStoriesKey, (stories) =>
        published
          ? stories
          : stories?.filter((story) => story.id !== id),
      )
      return { previousPublicStories, previousStories }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStories) {
        queryClient.setQueryData(adminStoriesKey, context.previousStories)
      }
      if (context?.previousPublicStories) {
        queryClient.setQueryData(publicStoriesKey, context.previousPublicStories)
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminStoriesKey }),
        queryClient.invalidateQueries({ queryKey: publicStoriesKey }),
      ]),
  })
}

export function getStoryPhotoUrl(path: string) {
  return getStoredPhotoUrl(path)
}

export function toEditableStoryPhotos(story: Story | null): EditableStoryPhoto[] {
  return toEditablePhotos(story?.photos ?? [])
}
