import { useEffect, useState } from 'react'

import { useConfigStore } from '@/stores/config-store'

function readDocumentDarkState() {
  if (typeof document === 'undefined') {
    return false
  }

  return document.documentElement.classList.contains('dark')
}

/**
 * 解析当前最终生效的暗色主题状态
 *
 * 配置为 dark/light 时直接返回固定值；配置为 system 时跟随系统媒体查询。
 * 组件可以用它选择暗色封面效果、图表配色或动画参数。
 */
export function useResolvedDarkTheme() {
  const theme = useConfigStore(state => state.config.theme)
  // 初始值读取 html.dark，避免 useTheme 已经写入主题时首帧状态反向。
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
      // system 模式需要监听系统偏好变化，不依赖 config store 再次更新。
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
