import { contextBridge, ipcRenderer } from 'electron'

import {
  SHORTCUT_ACTIONS,
  SHORTCUT_ACTION_CHANNEL,
  type GlobalShortcutRegistrationStatuses,
  type ShortcutActionId,
} from '../../shared/shortcut-keys'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type ShortcutApi = {
  onAction: (callback: (actionId: ShortcutActionId) => void) => () => void
  getGlobalRegistrationStatuses: () => Promise<GlobalShortcutRegistrationStatuses>
  onGlobalRegistrationStatusesChanged: (
    callback: (statuses: GlobalShortcutRegistrationStatuses) => void
  ) => () => void
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
  getGlobalRegistrationStatuses: async () => {
    return ipcRenderer.invoke(
      SHORTCUT_IPC_CHANNELS.GET_GLOBAL_REGISTRATION_STATUSES
    )
  },
  onGlobalRegistrationStatusesChanged: callback => {
    const listener = (_event: unknown, statuses: unknown) => {
      callback(statuses as GlobalShortcutRegistrationStatuses)
    }

    ipcRenderer.on(
      SHORTCUT_IPC_CHANNELS.GLOBAL_REGISTRATION_STATUSES_CHANGED,
      listener
    )

    return () => {
      ipcRenderer.removeListener(
        SHORTCUT_IPC_CHANNELS.GLOBAL_REGISTRATION_STATUSES_CHANGED,
        listener
      )
    }
  },
}

export function exposeShortcutApi() {
  contextBridge.exposeInMainWorld('electronShortcut', shortcutApi)
}
