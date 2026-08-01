import { supabase } from '../supabase/client'

export type EditablePhoto = {
  key: string
  path?: string
  previewUrl: string
  file?: File
}

const PHOTOS_BUCKET = 'dog-photos'

function getPhotoExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function getStoredPhotoUrl(path: string) {
  if (/^(blob:|data:|https?:\/\/|\/)/.test(path)) return path
  return supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl
}

export function toEditablePhotos(paths: string[]): EditablePhoto[] {
  return paths.map((path) => ({
    key: path,
    path,
    previewUrl: getStoredPhotoUrl(path),
  }))
}

export async function uploadNewPhotos(ownerPath: string, photos: EditablePhoto[]) {
  const uploadedPhotos = new Map<string, string>()

  try {
    for (const photo of photos) {
      if (!photo.file) continue
      const path = `${ownerPath}/${crypto.randomUUID()}.${getPhotoExtension(photo.file)}`
      const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, photo.file, {
        contentType: photo.file.type,
        upsert: false,
      })
      if (error) throw error
      uploadedPhotos.set(photo.key, path)
    }
    return uploadedPhotos
  } catch (error) {
    await removeStoredPhotos([...uploadedPhotos.values()]).catch(() => undefined)
    throw error
  }
}

export async function removeStoredPhotos(paths: string[]) {
  if (!paths.length) return
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove(paths)
  if (error) throw error
}
