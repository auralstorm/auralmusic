import electron from 'electron'

import { getConfiguredGlobalShortcutStatuses } from '../shortcuts/global-shortcuts'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'

const { ipcMain } = electron

export function registerShortcutIpc() {
  ipcMain.handle(SHORTCUT_IPC_CHANNELS.GET_GLOBAL_REGISTRATION_STATUSES, () => {
    return getConfiguredGlobalShortcutStatuses()
  })
}
