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

const ACTION_CLASSES =
  'min-h-11 w-full min-w-0 !gap-1 !px-2 !py-2 !text-sm [&_svg]:size-5'

export function StoryRow({ isEditing, onEdit, onRemove, onTogglePublished, story }: StoryRowProps) {
  return (
    <AdminListRow
      audit={story.audit}
      isEditing={isEditing}
      className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl p-3 min-[28rem]:grid-cols-[4rem_minmax(0,1fr)_13.5rem]"
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

      <div className="col-span-2 grid min-w-0 grid-cols-2 items-stretch gap-2 min-[28rem]:col-span-1 min-[28rem]:col-start-3 min-[28rem]:row-start-1">
        <Action
          onClick={onTogglePublished}
          size="small"
          variant={story.published ? 'neutral-inverted' : 'neutral-adaptive'}
          icon="check-circle-solid"
          aria-pressed={story.published}
          className={`${ACTION_CLASSES} ${
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
          className={ACTION_CLASSES}
        >
          Editar
        </Action>
        <Action
          onClick={onRemove}
          size="small"
          variant="neutral-adaptive"
          icon="trash-solid"
          className={ACTION_CLASSES}
        >
          Remover
        </Action>
      </div>
    </AdminListRow>
  )
}
