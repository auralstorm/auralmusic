import electron, { type BrowserWindow } from 'electron'

import type { AppConfig } from '../config/types'

const TITLEBAR_OVERLAY_HEIGHT = 52
const { nativeTheme } = electron

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

export function applyWindowTitleBarTheme(window: BrowserWindow) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return
  }

  window.setTitleBarOverlay(getTitleBarOverlayOptions())
}

export function syncNativeThemeSource(theme: AppConfig['theme']) {
  nativeTheme.themeSource = theme
}

export function handleThemePreferenceChange(theme: AppConfig['theme']) {
  syncNativeThemeSource(theme)

  for (const window of electron.BrowserWindow.getAllWindows()) {
    applyWindowTitleBarTheme(window)
  }
}
