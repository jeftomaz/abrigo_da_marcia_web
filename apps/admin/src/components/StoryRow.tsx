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
  'min-h-11 w-full min-w-0 !gap-0.5 !px-1 !py-2 !text-xs [&_svg]:size-3 [&_span]:min-w-0 [&_span]:truncate min-[24rem]:!gap-1 min-[24rem]:!px-2 min-[24rem]:!text-sm min-[24rem]:[&_svg]:size-4'

export function StoryRow({ isEditing, onEdit, onRemove, onTogglePublished, story }: StoryRowProps) {
  return (
    <AdminListRow
      audit={story.audit}
      isEditing={isEditing}
      className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)_9.25rem] items-center gap-2 rounded-2xl p-3 min-[24rem]:grid-cols-[4rem_minmax(0,1fr)_11.5rem] min-[24rem]:gap-3 desk:grid-cols-[4rem_minmax(0,1fr)_13.5rem]"
    >
      <div className="relative shrink-0">
        <div className="size-14 overflow-hidden rounded-xl min-[24rem]:size-16">
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

      <p className="min-w-0 flex-1 text-base leading-tight font-medium min-[24rem]:text-lg">{story.name}</p>

      <div className="col-start-3 row-start-1 grid min-w-0 grid-cols-2 items-stretch gap-2">
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
          className={`${ACTION_CLASSES} col-start-2 row-start-2`}
        >
          Remover
        </Action>
      </div>
    </AdminListRow>
  )
}
