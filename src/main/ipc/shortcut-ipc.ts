import electron from 'electron'

import { getConfiguredGlobalShortcutStatuses } from '../shortcuts/global-shortcuts'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'

const { ipcMain } = electron

/** 注册快捷键状态查询 IPC，动作事件本身由 global-shortcuts 直接广播到窗口。 */
export function registerShortcutIpc() {
  ipcMain.handle(SHORTCUT_IPC_CHANNELS.GET_GLOBAL_REGISTRATION_STATUSES, () => {
    return getConfiguredGlobalShortcutStatuses()
  })
}
