import { useEffect } from 'react'
import { useConfigStore } from '@/stores/config-store'

const SYSTEM_FONT_VALUE = 'system-ui'
const SYSTEM_FONT_STACK =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/**
 * 构建 CSS font-family 字符串
 * @param fontFamily 配置中的字体名称或 system-ui
 */
function resolveFontStack(fontFamily: string) {
  if (fontFamily === SYSTEM_FONT_VALUE) {
    return SYSTEM_FONT_STACK
  }

  // JSON.stringify 可安全包裹带空格/中文的字体名，避免手写引号转义遗漏。
  return `${JSON.stringify(fontFamily)}, ${SYSTEM_FONT_STACK}`
}

/**
 * 初始化并应用系统字体配置
 *
 * 将用户选择的字体写入 `--font-sans`，Tailwind/全局 CSS 统一消费该变量。
 */
export function useSystemFont() {
  const fontFamily = useConfigStore(state => state.config.fontFamily)
  const initConfig = useConfigStore(state => state.initConfig)
  const isLoading = useConfigStore(state => state.isLoading)
  const setConfig = useConfigStore(state => state.setConfig)

  useEffect(() => {
    if (!isLoading) {
      return
    }

    // 字体配置依赖全局 config，hook 自身只负责确保配置已初始化。
    void initConfig()
  }, [initConfig, isLoading])

  useEffect(() => {
    if (isLoading || !fontFamily) {
      return
    }

    // 字体通过 CSS 变量注入，避免组件树因字体切换发生额外状态传递。
    document.documentElement.style.setProperty(
      '--font-sans',
      resolveFontStack(fontFamily)
    )
  }, [fontFamily, isLoading])

  return {
    currentFontFamily: fontFamily,
    isFontLoading: isLoading,
    setFontFamily: (value: string) => setConfig('fontFamily', value),
  }
}

export { SYSTEM_FONT_VALUE }
