import electron, { type BrowserWindow } from 'electron'

import { getConfig } from '../config/store'
import {
  SHORTCUT_ACTION_CHANNEL,
  resolveGlobalShortcutRegistrationStatuses,
  type GlobalShortcutRegistrationStatuses,
} from '../../shared/shortcut-keys'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import { createMainLogger } from '../logging/logger'

const registeredAccelerators = new Set<string>()
const { globalShortcut } = electron
const shortcutLogger = createMainLogger('global-shortcut')
let latestConfiguredGlobalShortcutStatuses =
  {} as GlobalShortcutRegistrationStatuses

/** 返回最近一次全局快捷键注册结果，供设置页展示冲突/失败状态。 */
export function getConfiguredGlobalShortcutStatuses() {
  return latestConfiguredGlobalShortcutStatuses
}

/** 注销所有当前由应用注册的全局快捷键，窗口重建和退出前都需要调用。 */
export function clearConfiguredGlobalShortcuts() {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator)
  }

  registeredAccelerators.clear()
}

/**
 * 按当前配置同步全局快捷键。
 *
 * 每次同步都先清空旧注册，避免配置删除或改键后旧 accelerator 继续生效。
 */
export function syncConfiguredGlobalShortcuts(window: BrowserWindow | null) {
  clearConfiguredGlobalShortcuts()

  const enabled = getConfig('globalShortcutEnabled')
  const bindings = getConfig('shortcutBindings')

  if (!window || window.isDestroyed()) {
    // 没有可用窗口时仍计算状态，让 renderer 下次查询时能看到“未注册”的稳定结果。
    latestConfiguredGlobalShortcutStatuses =
      resolveGlobalShortcutRegistrationStatuses({
        enabled,
        bindings,
        isRegistered: () => false,
      })
    return
  }

  latestConfiguredGlobalShortcutStatuses =
    resolveGlobalShortcutRegistrationStatuses({
      enabled,
      bindings,
      isRegistered: (accelerator, actionId) => {
        let registered: boolean

        try {
          registered = globalShortcut.register(accelerator, () => {
            if (!window.isDestroyed()) {
              // 快捷键动作只发 actionId，具体业务由 renderer store/播放器处理。
              window.webContents.send(SHORTCUT_ACTION_CHANNEL, actionId)
            }
          })
        } catch (error) {
          shortcutLogger.warn('global shortcut registration failed', {
            accelerator,
            error,
          })
          return false
        }

        if (!registered) {
          shortcutLogger.warn('global shortcut registration failed', {
            accelerator,
          })
          return false
        }

        registeredAccelerators.add(accelerator)
        return true
      },
    })

  window.webContents.send(
    SHORTCUT_IPC_CHANNELS.GLOBAL_REGISTRATION_STATUSES_CHANGED,
    latestConfiguredGlobalShortcutStatuses
  )
}
