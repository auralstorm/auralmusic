import electron from 'electron'
import { IPC_CHANNELS, defaultConfig } from '../config/types'
import { getConfig, setConfig, resetConfig } from '../config/store'
import type { AppConfig } from '../config/types'
import { handleThemePreferenceChange } from '../window/titlebar-theme'

const { ipcMain } = electron

type RegisterConfigIpcOptions = {
  onShortcutConfigChange?: () => void
  onAutoStartConfigChange?: (enabled: boolean) => void
}

/**
 * 注册配置读写 IPC。
 *
 * 配置写入不仅是持久化，还可能触发主题、全局快捷键、开机自启等主进程副作用，
 * 所以这些副作用在主进程集中处理，不让 renderer 直接操作系统能力。
 */
export function registerConfigIpc(options: RegisterConfigIpcOptions = {}) {
  ipcMain.handle(IPC_CHANNELS.CONFIG.GET, (_event, key: keyof AppConfig) => {
    return getConfig(key)
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SET,
    (_event, key: keyof AppConfig, value: AppConfig[keyof AppConfig]) => {
      setConfig(key, value)

      if (key === 'theme') {
        // 主题需要即时影响 nativeTheme 和 Linux titlebar overlay。
        handleThemePreferenceChange(value as AppConfig['theme'])
      }

      if (key === 'globalShortcutEnabled' || key === 'shortcutBindings') {
        // 快捷键配置变更后立即重注册，避免配置 UI 和实际系统注册状态不一致。
        options.onShortcutConfigChange?.()
      }

      if (key === 'autoStartEnabled') {
        // 开机自启只能在主进程通过 Electron app API 同步。
        options.onAutoStartConfigChange?.(value as boolean)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.CONFIG.RESET, () => {
    resetConfig()
    // reset 后需要显式刷新这些有副作用的配置，否则当前会话仍保留旧状态。
    handleThemePreferenceChange(defaultConfig.theme)
    options.onShortcutConfigChange?.()
  })
}
