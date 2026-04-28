import { useCallback, useEffect, useState } from 'react'

import { getElectronWindowApi, isWindowsPlatform } from '@/lib/electron-runtime'

type UseWindowExpandedStateResult = {
  isExpanded: boolean
  canExpand: boolean
  toggleExpanded: () => Promise<boolean | void>
}

/**
 * 统一管理窗口“展开态”
 *
 * Windows 使用最大化/还原，macOS/Linux 使用全屏/退出全屏。
 * Header 的窗口按钮只消费这个 hook，不直接关心平台差异。
 */
export function useWindowExpandedState(): UseWindowExpandedStateResult {
  const electronWindow = getElectronWindowApi()
  const isWindows = isWindowsPlatform()
  // 当前窗口是否处于最大化或全屏态，具体语义由平台决定。
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
      // Windows 标题栏使用 maximize 语义，避免 fullScreen 破坏原生窗口控制体验。
      void electronWindow.isMaximized().then(syncExpandedState)

      const unsubscribe = electronWindow.onMaximizeChange(syncExpandedState)

      return () => {
        isMounted = false
        unsubscribe()
      }
    }

    // 非 Windows 平台使用 fullScreen，更符合系统窗口按钮的预期交互。
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

    // 切换动作也按平台分发，保证 UI 状态监听和实际窗口行为一致。
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
