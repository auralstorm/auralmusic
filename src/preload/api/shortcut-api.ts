import { contextBridge, ipcRenderer } from 'electron'

import {
  SHORTCUT_ACTIONS,
  SHORTCUT_ACTION_CHANNEL,
  type ShortcutActionId,
} from '../../shared/shortcut-keys'

export type ShortcutApi = {
  onAction: (callback: (actionId: ShortcutActionId) => void) => () => void
}

function isShortcutActionId(value: unknown): value is ShortcutActionId {
  return (
    typeof value === 'string' &&
    SHORTCUT_ACTIONS.includes(value as ShortcutActionId)
  )
}

const shortcutApi: ShortcutApi = {
  onAction: callback => {
    const listener = (_event: unknown, actionId: unknown) => {
      if (isShortcutActionId(actionId)) {
        callback(actionId)
      }
    }

    ipcRenderer.on(SHORTCUT_ACTION_CHANNEL, listener)

    return () => {
      ipcRenderer.removeListener(SHORTCUT_ACTION_CHANNEL, listener)
    }
  },
}

export function exposeShortcutApi() {
  contextBridge.exposeInMainWorld('electronShortcut', shortcutApi)
}
