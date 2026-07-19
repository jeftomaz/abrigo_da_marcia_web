import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 1360px)'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_QUERY)
    const handleChange = () => setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}
