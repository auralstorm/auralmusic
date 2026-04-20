import { useCallback, useEffect, useState } from 'react'

import { getElectronWindowApi, isWindowsPlatform } from '@/lib/electron-runtime'

type UseWindowExpandedStateResult = {
  isExpanded: boolean
  canExpand: boolean
  toggleExpanded: () => Promise<boolean | void>
}

export function useWindowExpandedState(): UseWindowExpandedStateResult {
  const electronWindow = getElectronWindowApi()
  const isWindows = isWindowsPlatform()
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!electronWindow) {
      setIsExpanded(false)
      return
    }

    let isMounted = true

    const syncExpandedState = (value: boolean) => {
      if (isMounted) {
        setIsExpanded(value)
      }
    }

    if (isWindows) {
      void electronWindow.isMaximized().then(syncExpandedState)

      const unsubscribe = electronWindow.onMaximizeChange(syncExpandedState)

      return () => {
        isMounted = false
        unsubscribe()
      }
    }

    void electronWindow.isFullScreen().then(syncExpandedState)

    const unsubscribe = electronWindow.onFullScreenChange(syncExpandedState)

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [electronWindow, isWindows])

  const toggleExpanded = useCallback(async () => {
    if (!electronWindow) {
      return
    }

    if (isWindows) {
      return electronWindow.toggleMaximize()
    }

    return electronWindow.toggleFullScreen()
  }, [electronWindow, isWindows])

  return {
    isExpanded,
    canExpand: Boolean(electronWindow),
    toggleExpanded,
  }
}
