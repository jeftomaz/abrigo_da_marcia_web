import { useCallback, useEffect, useRef, useState } from 'react'

const DISPLAY_MS = 4000

export function useSuccessMessage() {
  const [message, setMessage] = useState('')
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const showSuccess = useCallback((text: string) => {
    window.clearTimeout(timeoutRef.current)
    setMessage(text)
    timeoutRef.current = window.setTimeout(() => setMessage(''), DISPLAY_MS)
  }, [])

  return [message, showSuccess] as const
}
