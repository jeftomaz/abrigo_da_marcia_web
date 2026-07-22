import { useMemo, useState } from 'react'
import {
  Action,
  Dialog,
  Icon,
  useAdminStories,
  useDeleteStory,
  useSaveStory,
  useUpdateStoryPublished,
} from '@abrigo/shared'
import type { Story, StoryDraft } from '@abrigo/shared'
import { StatCards } from '../components/StatCards'
import { StoryForm } from '../components/StoryForm'
import { StoryRow } from '../components/StoryRow'
import { useIsDesktop } from '../hooks/useIsDesktop'

export function Historias() {
  const { data: stories = [], isLoading, error } = useAdminStories()
  const saveStory = useSaveStory()
  const deleteStory = useDeleteStory()
  const updateStoryPublished = useUpdateStoryPublished()
  const [search, setSearch] = useState('')
  const [publicationFilter, setPublicationFilter] = useState<'published' | 'draft' | ''>('')
  const [editingTarget, setEditingTarget] = useState<Story | null | undefined>(undefined)
  const [operationError, setOperationError] = useState('')
  const [confirmation, setConfirmation] = useState<{ action: 'publish' | 'remove'; story: Story } | null>(null)
  const isDesktop = useIsDesktop()
  const isEditing = editingTarget !== undefined

  const filteredStories = useMemo(
    () =>
      stories.filter(
        (story) =>
          (!search || story.name.toLowerCase().includes(search.toLowerCase())) &&
          (!publicationFilter ||
            (publicationFilter === 'published' ? story.published : !story.published)),
      ),
    [publicationFilter, search, stories],
  )

  const handleSave = async (story: StoryDraft) => {
    await saveStory.mutateAsync(story)
    setEditingTarget(undefined)
  }

  const confirmAction = async () => {
    if (!confirmation) return
    setOperationError('')
    try {
      if (confirmation.action === 'remove') await deleteStory.mutateAsync(confirmation.story)
      else await updateStoryPublished.mutateAsync({ id: confirmation.story.id, published: !confirmation.story.published })
      setConfirmation(null)
    } catch {
      setOperationError('Não foi possível concluir a ação.')
    }
  }

  const formTitle = editingTarget ? 'Editar História' : 'Nova História'

  return (
    <main className="flex-1 overflow-x-hidden bg-cinza-claro px-4 py-8 text-cinza-escuro sm:px-6 desk:py-4 dark:bg-cinza-escuro dark:text-cinza-claro">
      <div
        className={`mx-auto grid w-full min-w-0 max-w-[640px] gap-8 desk:items-start desk:gap-6 ${
          isEditing
            ? 'desk:max-w-[1920px] desk:grid-cols-[minmax(17rem,29rem)_minmax(26rem,29rem)_minmax(32rem,45rem)] desk:justify-between'
            : 'desk:max-w-[64rem] desk:grid-cols-[29rem_29rem] desk:justify-between'
        }`}
      >
        <StatCards label="Total de histórias" total={stories.length} />

        <section className="flex min-w-0 flex-col gap-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 desk:gap-3">
            <h1 className="text-2xl font-medium text-marca desk:col-span-3 desk:text-3xl">
              Histórias Contadas
            </h1>
            <div className="relative shrink-0 desk:col-start-2 desk:row-start-2">
              <select
                value={publicationFilter}
                onChange={(event) =>
                  setPublicationFilter(event.target.value as 'published' | 'draft' | '')
                }
                aria-label="Filtrar histórias por publicação"
                className="h-10 appearance-none rounded-full bg-white pr-8 pl-3 text-sm text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
              >
                <option value="">Todos os status</option>
                <option value="published">Publicadas</option>
                <option value="draft">Rascunhos</option>
              </select>
              <Icon
                name="arrow-separate-vertical"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
              />
            </div>
            <Action
              onClick={() => setEditingTarget(null)}
              icon="keyframe-plus-in-solid"
              size="small"
              variant="primary-adaptive"
              className="px-4 desk:col-start-3 desk:row-start-2"
            >
              Nova História
            </Action>
            <div className="relative col-span-3 min-w-0 desk:col-span-1 desk:col-start-1 desk:row-start-2">
              <Icon
                name="search"
                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 opacity-60"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca por nome..."
                aria-label="Busca por nome"
                className="h-10 w-full rounded-full bg-white pr-4 pl-12 text-cinza-escuro outline-none focus-visible:ring-2 focus-visible:ring-marca dark:bg-cinza-medio dark:text-cinza-claro"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2 rounded-3xl bg-cinza-claro p-2 desk:gap-3 desk:bg-transparent desk:p-0 dark:bg-cinza-medio desk:dark:bg-transparent">
            {isLoading && <p className="text-center">Carregando histórias...</p>}
            {error && <p role="alert" className="text-center">Não foi possível carregar as histórias.</p>}
            {operationError && <p role="alert" className="text-center">{operationError}</p>}
            {filteredStories.map((story) => (
              <StoryRow
                key={story.id}
                story={story}
                isEditing={editingTarget?.id === story.id}
                onEdit={() => setEditingTarget(story)}
                onRemove={() => setConfirmation({ action: 'remove', story })}
                onTogglePublished={() => setConfirmation({ action: 'publish', story })}
              />
            ))}
            {!isLoading && !error && filteredStories.length === 0 && (
              <p className="text-center">Nenhuma história encontrada.</p>
            )}
          </div>
        </section>

        {isEditing && isDesktop && (
          <aside className="w-full rounded-3xl bg-surface-raised p-6 text-on-surface-raised">
            <StoryForm
              key={editingTarget?.id ?? 'new'}
              story={editingTarget ?? null}
              layout="panel"
              title={formTitle}
              onCancel={() => setEditingTarget(undefined)}
              onSave={handleSave}
            />
          </aside>
        )}
      </div>

      {isEditing && !isDesktop && (
        <Dialog
          ariaLabel={formTitle}
          onClose={() => setEditingTarget(undefined)}
          className="max-h-[90vh] w-full max-w-[46rem] overflow-y-auto rounded-3xl bg-surface-raised p-6 text-on-surface-raised sm:p-8"
        >
          <StoryForm
            key={editingTarget?.id ?? 'new'}
            story={editingTarget ?? null}
            layout="modal"
            title={formTitle}
            onCancel={() => setEditingTarget(undefined)}
            onSave={handleSave}
          />
        </Dialog>
      )}
      {confirmation && (
        <Dialog ariaLabel="Confirmar ação na história" onClose={() => setConfirmation(null)} className="w-full max-w-[34rem] rounded-3xl bg-surface-raised p-8 text-on-surface-raised">
          <h2 className="text-3xl font-medium text-marca">{confirmation.action === 'remove' ? 'Excluir história' : confirmation.story.published ? 'Mover para rascunhos' : 'Publicar história'}</h2>
          <p className="mt-4 text-lg">{confirmation.story.name}</p>
          <p className="mt-3">{confirmation.action === 'remove' ? 'A história e suas imagens serão removidas definitivamente.' : confirmation.story.published ? 'A história deixará de aparecer no site público.' : 'A história passará a aparecer no site público.'}</p>
          <div className="mt-8 flex gap-4">
            <Action onClick={() => setConfirmation(null)} size="small" variant="secondary-adaptive" className="w-28">Cancelar</Action>
            <Action onClick={() => void confirmAction()} disabled={deleteStory.isPending || updateStoryPublished.isPending} size="small" variant="primary-adaptive" className="flex-1">Confirmar</Action>
          </div>
        </Dialog>
      )}
    </main>
  )
}
