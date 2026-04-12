import electron, { type BrowserWindow } from 'electron'

import { getConfig } from '../config/store'
import {
  SHORTCUT_ACTION_CHANNEL,
  resolveEnabledGlobalShortcutRegistrations,
} from '../../shared/shortcut-keys'

const registeredAccelerators = new Set<string>()
const { globalShortcut } = electron

export function clearConfiguredGlobalShortcuts() {
  for (const accelerator of registeredAccelerators) {
    globalShortcut.unregister(accelerator)
  }

  registeredAccelerators.clear()
}

export function syncConfiguredGlobalShortcuts(window: BrowserWindow | null) {
  clearConfiguredGlobalShortcuts()

  if (!window || window.isDestroyed()) {
    return
  }

  const registrations = resolveEnabledGlobalShortcutRegistrations({
    enabled: getConfig('globalShortcutEnabled'),
    bindings: getConfig('shortcutBindings'),
  })

  for (const { actionId, accelerator } of registrations) {
    let registered: boolean

    try {
      registered = globalShortcut.register(accelerator, () => {
        if (!window.isDestroyed()) {
          window.webContents.send(SHORTCUT_ACTION_CHANNEL, actionId)
        }
      })
    } catch (error) {
      console.warn(`global shortcut registration failed: ${accelerator}`, error)
      continue
    }

    if (!registered) {
      console.warn(`global shortcut registration failed: ${accelerator}`)
      continue
    }

    registeredAccelerators.add(accelerator)
  }
}
