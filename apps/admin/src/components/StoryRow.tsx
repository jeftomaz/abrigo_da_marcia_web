import { Action, Icon, getStoryPhotoUrl } from '@abrigo/shared'
import type { Story } from '@abrigo/shared'
import { StatusBadge } from './StatusBadge'

type StoryRowProps = {
  isEditing: boolean
  onEdit: () => void
  onRemove: () => void
  onTogglePublished: () => void
  story: Story
}

const DARK_NEUTRAL_ACTION_CLASSES =
  'dark:!bg-cinza-medio dark:!text-cinza-claro dark:hover:!bg-cinza-claro dark:hover:!text-cinza-escuro'

export function StoryRow({ isEditing, onEdit, onRemove, onTogglePublished, story }: StoryRowProps) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl bg-surface-raised p-3 text-on-surface-raised">
      <div className="relative shrink-0">
        <div className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-cinza-claro dark:bg-cinza-medio sm:size-16">
          <Icon name="pata" className="size-7 text-cinza-medio dark:text-cinza-claro sm:size-8" />
          {story.photos[0] && (
            <img
              src={getStoryPhotoUrl(story.photos[0])}
              alt=""
              className="absolute inset-0 h-full w-full rounded-xl object-cover"
            />
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
          variant={story.published ? 'neutral-inverted' : 'neutral'}
          icon="check-circle-solid"
          aria-pressed={story.published}
          className={`gap-1 px-3 ${
            story.published
              ? '!bg-cinza-escuro !text-cinza-claro hover:!bg-cinza-medio dark:!bg-cinza-claro dark:!text-cinza-escuro dark:hover:!bg-white'
              : DARK_NEUTRAL_ACTION_CLASSES
          }`}
        >
          {story.published ? 'Publicada' : 'Publicar'}
        </Action>
        <Action
          onClick={onEdit}
          size="small"
          variant={isEditing ? 'secondary' : 'neutral'}
          icon="edit-pencil"
          aria-pressed={isEditing}
          className={`gap-1 px-3 ${isEditing ? '' : DARK_NEUTRAL_ACTION_CLASSES}`}
        >
          Editar
        </Action>
        <Action
          onClick={onRemove}
          size="small"
          variant="neutral"
          icon="trash-solid"
          className={`gap-1 px-3 ${DARK_NEUTRAL_ACTION_CLASSES}`}
        >
          Remover
        </Action>
      </div>
    </article>
  )
}
