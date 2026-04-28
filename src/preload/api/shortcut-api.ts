import { contextBridge, ipcRenderer } from 'electron'

import {
  SHORTCUT_ACTIONS,
  SHORTCUT_ACTION_CHANNEL,
  type GlobalShortcutRegistrationStatuses,
  type ShortcutActionId,
} from '../../shared/shortcut-keys'
import { SHORTCUT_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type ShortcutApi = {
  /** 订阅主进程分发的快捷键动作；只向业务层传递已登记的动作 id。 */
  onAction: (callback: (actionId: ShortcutActionId) => void) => () => void
  /** 获取全局快捷键注册状态，用于展示哪些快捷键被系统或其它应用占用。 */
  getGlobalRegistrationStatuses: () => Promise<GlobalShortcutRegistrationStatuses>
  /** 订阅全局快捷键注册状态变化；返回取消函数用于页面卸载时清理。 */
  onGlobalRegistrationStatusesChanged: (
    callback: (statuses: GlobalShortcutRegistrationStatuses) => void
  ) => () => void
}

/** 对主进程传入值做白名单校验，防止未知字符串被当成业务动作执行。 */
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
    // 注册状态对象由主进程的 shortcut service 维护，这里只负责把广播转成 renderer 回调。
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
  // 快捷键桥接不暴露 registerGlobalShortcut 等底层能力，避免 renderer 绕过主进程策略。
  contextBridge.exposeInMainWorld('electronShortcut', shortcutApi)
}
