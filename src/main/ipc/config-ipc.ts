import electron from 'electron'
import { IPC_CHANNELS, defaultConfig } from '../config/types'
import { getConfig, setConfig, resetConfig } from '../config/store'
import type { AppConfig } from '../config/types'
import { handleThemePreferenceChange } from '../window/titlebar-theme'

const { ipcMain } = electron

type RegisterConfigIpcOptions = {
  onShortcutConfigChange?: () => void
}

export function registerConfigIpc(options: RegisterConfigIpcOptions = {}) {
  ipcMain.handle(IPC_CHANNELS.CONFIG.GET, (_event, key: keyof AppConfig) => {
    return getConfig(key)
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SET,
    (_event, key: keyof AppConfig, value: AppConfig[keyof AppConfig]) => {
      setConfig(key, value)

      if (key === 'theme') {
        handleThemePreferenceChange(value as AppConfig['theme'])
      }

      if (key === 'globalShortcutEnabled' || key === 'shortcutBindings') {
        options.onShortcutConfigChange?.()
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CONFIG.RESET, () => {
    resetConfig()
    handleThemePreferenceChange(defaultConfig.theme)
    options.onShortcutConfigChange?.()
  })
}
