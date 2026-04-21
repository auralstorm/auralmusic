import { contextBridge, ipcRenderer } from 'electron'

import type { AppUpdateSnapshot } from '../../shared/update.ts'
import { UPDATE_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type UpdateApi = {
  getSnapshot: () => Promise<AppUpdateSnapshot>
  checkForUpdates: () => Promise<AppUpdateSnapshot>
  startUpdate: () => Promise<AppUpdateSnapshot>
  restartAndInstall: () => Promise<void>
  openDownloadPage: () => Promise<void>
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
  contextBridge.exposeInMainWorld('electronUpdate', updateApi)
}
