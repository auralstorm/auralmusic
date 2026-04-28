import electron, { type BrowserWindow } from 'electron'

import type { AppConfig } from '../config/types'

const TITLEBAR_OVERLAY_HEIGHT = 52
const { nativeTheme } = electron

/** 根据当前系统深浅色生成 Linux titleBarOverlay 颜色。 */
function getTitleBarOverlayOptions() {
  if (nativeTheme.shouldUseDarkColors) {
    return {
      color: '#09090b',
      symbolColor: '#f5f7fb',
      height: TITLEBAR_OVERLAY_HEIGHT,
    }
  }

  return {
    color: '#ffffff',
    symbolColor: '#111111',
    height: TITLEBAR_OVERLAY_HEIGHT,
  }
}

/**
 * 同步窗口标题栏颜色。
 *
 * macOS/Windows 使用各自的标题栏方案，只有启用 titleBarOverlay 的平台需要手动设置。
 */
export function applyWindowTitleBarTheme(window: BrowserWindow) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return
  }

  window.setTitleBarOverlay(getTitleBarOverlayOptions())
}

/** 将应用配置中的主题偏好同步给 Electron nativeTheme。 */
export function syncNativeThemeSource(theme: AppConfig['theme']) {
  nativeTheme.themeSource = theme
}

/** 主题配置变更后刷新所有现有窗口标题栏，避免只在下次启动生效。 */
export function handleThemePreferenceChange(theme: AppConfig['theme']) {
  syncNativeThemeSource(theme)

  for (const window of electron.BrowserWindow.getAllWindows()) {
    applyWindowTitleBarTheme(window)
  }
}
