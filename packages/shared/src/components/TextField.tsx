import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

type TextFieldProps =
  | ({ as?: 'input' } & InputHTMLAttributes<HTMLInputElement>)
  | ({ as: 'select' } & SelectHTMLAttributes<HTMLSelectElement>)
  | ({ as: 'textarea' } & TextareaHTMLAttributes<HTMLTextAreaElement>)

const BASE_CLASSES =
  'w-full rounded-lg border-2 border-cinza-medio bg-transparent text-current outline-none placeholder:text-cinza-medio/50 transition-colors enabled:hover:border-cinza-escuro focus-visible:border-marca disabled:cursor-not-allowed disabled:opacity-40 dark:border-cinza-claro dark:placeholder:text-cinza-claro/50 dark:enabled:hover:border-cinza-claro/70'

export function TextField(props: TextFieldProps) {
  const { as = 'input', className = '', ...rest } = props
  const classes = `${BASE_CLASSES} ${className}`
  if (as === 'textarea') return <textarea {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} className={classes} />
  if (as === 'select') return <select {...(rest as SelectHTMLAttributes<HTMLSelectElement>)} className={classes} />
  return <input {...(rest as InputHTMLAttributes<HTMLInputElement>)} className={classes} />
}
