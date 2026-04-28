import { ipcMain } from 'electron'

import { UPDATE_IPC_CHANNELS } from '../../shared/ipc/index.ts'
import type { UpdateService } from '../updater/update-service.ts'

/** 注册自动更新 IPC，所有更新状态机操作都委托给 UpdateService。 */
export function registerUpdateIpc(updateService: UpdateService) {
  ipcMain.handle(UPDATE_IPC_CHANNELS.GET_SNAPSHOT, () => {
    return updateService.getSnapshot()
  })

  ipcMain.handle(UPDATE_IPC_CHANNELS.CHECK_FOR_UPDATES, () => {
    return updateService.checkForUpdates('manual')
  })

  ipcMain.handle(UPDATE_IPC_CHANNELS.START_UPDATE, () => {
    return updateService.startUpdate()
  })

  ipcMain.handle(UPDATE_IPC_CHANNELS.RESTART_AND_INSTALL, async () => {
    await updateService.restartAndInstall()
  })

  ipcMain.handle(UPDATE_IPC_CHANNELS.OPEN_DOWNLOAD_PAGE, async () => {
    await updateService.openDownloadPage()
  })
}
