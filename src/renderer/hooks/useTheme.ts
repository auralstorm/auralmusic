import { useEffect } from 'react'

import { useConfigStore } from '../stores/config-store'
import {
  applyThemeColorOverrides,
  clearThemeColorOverrides,
  normalizeThemeColor,
} from '../theme/theme-color'

/**
 * 初始化并应用应用主题
 *
 * 负责三件事：
 * 1. 触发配置初始化
 * 2. 根据 light/dark/system 同步 html.dark
 * 3. 将主题色写入 CSS 变量
 */
export function useTheme() {
  const theme = useConfigStore(state => state.config.theme)
  const themeColor = useConfigStore(state => state.config.themeColor)
  const initConfig = useConfigStore(state => state.initConfig)
  const isLoading = useConfigStore(state => state.isLoading)
  const setConfig = useConfigStore(state => state.setConfig)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      // 配置已加载后不重复初始化，避免覆盖用户运行期刚改过的主题。
      if (!isLoading && isMounted) {
        return
      }

      await initConfig()
    }

    void init()

    return () => {
      isMounted = false
    }
  }, [initConfig, isLoading])

  useEffect(() => {
    if (isLoading || !theme) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateDarkMode = () => {
      // system 模式跟随系统媒体查询，light/dark 模式直接覆盖系统偏好。
      const isDark =
        theme === 'dark' || (theme === 'system' && mediaQuery.matches)

      document.documentElement.classList.toggle('dark', isDark)
    }

    updateDarkMode()
    mediaQuery.addEventListener('change', updateDarkMode)

    return () => {
      mediaQuery.removeEventListener('change', updateDarkMode)
    }
  }, [theme, isLoading])

  useEffect(() => {
    if (isLoading) {
      return
    }

    const rootStyle = document.documentElement.style
    const normalizedThemeColor = normalizeThemeColor(themeColor)

    if (!normalizedThemeColor) {
      // 非法主题色清理运行期覆盖，让样式回到默认 CSS token。
      clearThemeColorOverrides(rootStyle)
      return
    }

    // 主题色以 CSS 变量方式注入，避免每个组件单独订阅颜色配置。
    applyThemeColorOverrides(rootStyle, normalizedThemeColor)
  }, [themeColor, isLoading])

  return {
    currentTheme: theme,
    isThemeLoading: isLoading,
    setLightTheme: () => setConfig('theme', 'light'),
    setDarkTheme: () => setConfig('theme', 'dark'),
    setSystemTheme: () => setConfig('theme', 'system'),
  }
}
