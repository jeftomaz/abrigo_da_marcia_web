import { useState } from 'react'
import { Icon } from '@abrigo/shared'

type Tag = { id: string; name: string }

type TagInputProps = {
  id: string
  onChange: (tags: Tag[]) => void
  placeholder?: string
  tags: Tag[]
}

export function TagInput({ id, onChange, placeholder, tags }: TagInputProps) {
  const [value, setValue] = useState('')

  const addTag = () => {
    const name = value.trim()
    if (!name) return
    if (!tags.some((tag) => tag.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      onChange([...tags, { id: crypto.randomUUID(), name }])
    }
    setValue('')
  }

  return (
    <div className="flex min-h-10 w-full flex-wrap items-center gap-2 rounded-lg border-2 border-cinza-medio bg-transparent px-2 py-1 text-current focus-within:border-marca dark:border-cinza-claro">
      {tags.map((tag) => (
        <span key={tag.id} className="flex items-center gap-1 rounded-full bg-marca px-3 py-1 text-sm text-marca-clara">
          {tag.name}
          <button
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => onChange(tags.filter((item) => item.id !== tag.id))}
            aria-label={`Remover ${tag.name}`}
            className="rounded-full hover:text-marca-escura focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca-clara"
          >
            <Icon name="xmark-circle-solid" className="size-4" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={addTag}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addTag()
          }
          if (event.key === 'Backspace' && !value && tags.length) {
            onChange(tags.slice(0, -1))
          }
        }}
        placeholder={tags.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-cinza-medio/60 dark:placeholder:text-cinza-claro/60"
      />
    </div>
  )
}
