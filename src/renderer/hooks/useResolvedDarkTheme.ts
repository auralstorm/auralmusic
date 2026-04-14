import { useEffect, useState } from 'react'

import { useConfigStore } from '@/stores/config-store'

function readDocumentDarkState() {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark')
}

export function useResolvedDarkTheme() {
  const theme = useConfigStore(state => state.config.theme)
  const [isDarkTheme, setIsDarkTheme] = useState(readDocumentDarkState)

  useEffect(() => {
    if (theme === 'dark') {
      setIsDarkTheme(true)
      return
    }

    if (theme === 'light') {
      setIsDarkTheme(false)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      setIsDarkTheme(mediaQuery.matches)
    }

    update()
    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [theme])

  return isDarkTheme
}
