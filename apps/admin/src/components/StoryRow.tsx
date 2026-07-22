import { Action, ImagePlaceholder, getStoryPhotoUrl } from '@abrigo/shared'
import type { Story } from '@abrigo/shared'
import { AdminListRow } from './AdminListRow'
import { StatusBadge } from './StatusBadge'

type StoryRowProps = {
  isEditing: boolean
  onEdit: () => void
  onRemove: () => void
  onTogglePublished: () => void
  story: Story
}

export function StoryRow({ isEditing, onEdit, onRemove, onTogglePublished, story }: StoryRowProps) {
  return (
    <AdminListRow
      isEditing={isEditing}
      className="flex min-w-0 items-center gap-3 rounded-2xl p-3"
    >
      <div className="relative shrink-0">
        <div className="size-14 overflow-hidden rounded-xl sm:size-16">
          {story.photos[0] ? (
            <img
              src={getStoryPhotoUrl(story.photos[0])}
              alt=""
              className="absolute inset-0 h-full w-full rounded-xl object-cover"
            />
          ) : (
            <ImagePlaceholder label={`Sem foto de ${story.name}`} className="h-full w-full" />
          )}
        </div>
        {!story.published && (
          <StatusBadge tone="marca-escura" size="sm" className="absolute -bottom-2 left-0">
            Rascunho
          </StatusBadge>
        )}
      </div>

      <p className="min-w-0 flex-1 text-base leading-tight font-medium sm:text-lg">{story.name}</p>

      <div className="flex min-w-0 max-w-[13rem] shrink flex-wrap justify-end gap-2">
        <Action
          onClick={onTogglePublished}
          size="small"
          variant={story.published ? 'neutral-inverted' : 'neutral-adaptive'}
          icon="check-circle-solid"
          aria-pressed={story.published}
          className={`gap-1 px-3 ${
            story.published
              ? '!bg-cinza-escuro !text-cinza-claro hover:!bg-cinza-medio dark:!bg-cinza-claro dark:!text-cinza-escuro dark:hover:!bg-cinza-medio dark:hover:!text-cinza-claro dark:active:!bg-cinza-escuro dark:active:!text-cinza-claro'
              : ''
          }`}
        >
          {story.published ? 'Publicada' : 'Publicar'}
        </Action>
        <Action
          onClick={onEdit}
          size="small"
          variant={isEditing ? 'secondary-adaptive' : 'neutral-adaptive'}
          icon="edit-pencil"
          aria-pressed={isEditing}
          className="gap-1 px-3"
        >
          Editar
        </Action>
        <Action
          onClick={onRemove}
          size="small"
          variant="neutral-adaptive"
          icon="trash-solid"
          className="gap-1 px-3"
        >
          Remover
        </Action>
      </div>
    </AdminListRow>
  )
}
