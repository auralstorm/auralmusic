import { contextBridge, ipcRenderer } from 'electron'

import type { AppUpdateSnapshot } from '../../shared/update.ts'
import { UPDATE_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type UpdateApi = {
  /** 读取当前更新状态快照，不触发网络检查，适合页面初始化时恢复 UI。 */
  getSnapshot: () => Promise<AppUpdateSnapshot>
  /** 主动检查新版本，并返回检查结束后的状态快照。 */
  checkForUpdates: () => Promise<AppUpdateSnapshot>
  /** 开始下载或继续更新流程，具体状态机由主进程 updater 维护。 */
  startUpdate: () => Promise<AppUpdateSnapshot>
  /** 重启应用并安装已下载的更新包。 */
  restartAndInstall: () => Promise<void>
  /** 打开外部下载页，通常用于自动更新不可用或需要手动下载安装包的场景。 */
  openDownloadPage: () => Promise<void>
  /** 订阅更新状态机变化；返回取消订阅函数，避免页面切换后重复接收事件。 */
  onStateChange: (callback: (snapshot: AppUpdateSnapshot) => void) => () => void
}

const updateApi: UpdateApi = {
  getSnapshot: async () => {
    return ipcRenderer.invoke(UPDATE_IPC_CHANNELS.GET_SNAPSHOT)
  },
  checkForUpdates: async () => {
    return ipcRenderer.invoke(UPDATE_IPC_CHANNELS.CHECK_FOR_UPDATES)
  },
  startUpdate: async () => {
    return ipcRenderer.invoke(UPDATE_IPC_CHANNELS.START_UPDATE)
  },
  restartAndInstall: async () => {
    await ipcRenderer.invoke(UPDATE_IPC_CHANNELS.RESTART_AND_INSTALL)
  },
  openDownloadPage: async () => {
    await ipcRenderer.invoke(UPDATE_IPC_CHANNELS.OPEN_DOWNLOAD_PAGE)
  },
  onStateChange: callback => {
    // 状态快照由主进程统一生成，preload 只做事件桥接，保证渲染层拿到的是同一份数据模型。
    const listener = (_event: unknown, snapshot: AppUpdateSnapshot) => {
      callback(snapshot)
    }

    ipcRenderer.on(UPDATE_IPC_CHANNELS.STATE_CHANGED, listener)

    return () => {
      ipcRenderer.removeListener(UPDATE_IPC_CHANNELS.STATE_CHANGED, listener)
    }
  },
}

export function exposeUpdateApi() {
  // 自动更新涉及文件系统和进程重启，只通过白名单方法暴露给 renderer。
  contextBridge.exposeInMainWorld('electronUpdate', updateApi)
}
