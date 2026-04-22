import electron, { type BrowserWindow } from 'electron'

import { getConfig } from '../config/store'
import {
  SHORTCUT_ACTION_CHANNEL,
  resolveGlobalShortcutRegistrationStatuses,
  type GlobalShortcutRegistrationStatuses,
} from '../../shared/shortcut-keys'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'

const registeredAccelerators = new Set<string>()
const { globalShortcut } = electron
let latestConfiguredGlobalShortcutStatuses =
  {} as GlobalShortcutRegistrationStatuses

export function getConfiguredGlobalShortcutStatuses() {
  return latestConfiguredGlobalShortcutStatuses
}

export function clearConfiguredGlobalShortcuts() {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator)
  }

  registeredAccelerators.clear()
}

export function syncConfiguredGlobalShortcuts(window: BrowserWindow | null) {
  clearConfiguredGlobalShortcuts()

  const enabled = getConfig('globalShortcutEnabled')
  const bindings = getConfig('shortcutBindings')

  if (!window || window.isDestroyed()) {
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
              window.webContents.send(SHORTCUT_ACTION_CHANNEL, actionId)
            }
          })
        } catch (error) {
          console.warn(
            `global shortcut registration failed: ${accelerator}`,
            error
          )
          return false
        }

        if (!registered) {
          console.warn(`global shortcut registration failed: ${accelerator}`)
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
