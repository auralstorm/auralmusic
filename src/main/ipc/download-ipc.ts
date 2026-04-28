import electron from 'electron'

import { getConfig } from '../config/store.ts'
import { DownloadService } from '../download/download-service.ts'
import { DOWNLOAD_IPC_CHANNELS } from '../download/download-types.ts'
import {
  getPersistedDownloadTasks,
  setPersistedDownloadTasks,
} from '../download/store.ts'

type DownloadIpcRegistrationOptions = {
  ipcMain?: {
    handle: (
      channel: string,
      handler: (...args: unknown[]) => unknown | Promise<unknown>
    ) => void
  }
  dialog?: {
    showOpenDialog: (
      window: unknown,
      options: {
        title: string
        defaultPath: string
        properties: string[]
      }
    ) => Promise<{
      canceled: boolean
      filePaths: string[]
    }>
  }
  browserWindowFromWebContents?: (webContents: unknown) => unknown
  getAllWindows?: () => Array<{
    webContents: {
      send: (channel: string, payload: unknown) => void
    }
  }>
  appGetPath?: (name: 'downloads') => string
  downloadService?: DownloadService
}

/**
 * 创建默认下载服务。
 *
 * 下载服务需要读取大量配置和系统打开文件能力，这里集中注入，DownloadService 本身只关心业务流程。
 */
function createDefaultDownloadService(
  appGetPath: (name: 'downloads') => string
) {
  return new DownloadService({
    defaultRootDir: appGetPath('downloads'),
    readPersistedTasks: () => getPersistedDownloadTasks(),
    writePersistedTasks: tasks => {
      setPersistedDownloadTasks(tasks)
    },
    readConfig: () => ({
      // 每次读取任务配置时取最新值，下载队列能响应用户刚修改的目录、质量和并发设置。
      musicSourceEnabled: getConfig('musicSourceEnabled'),
      musicSourceProviders: getConfig('musicSourceProviders'),
      luoxueSourceEnabled: getConfig('luoxueSourceEnabled'),
      customMusicApiEnabled: getConfig('customMusicApiEnabled'),
      customMusicApiUrl: getConfig('customMusicApiUrl'),
      downloadDir: getConfig('downloadDir'),
      downloadQuality: getConfig('downloadQuality'),
      downloadQualityPolicy: getConfig('downloadQualityPolicy'),
      downloadSkipExisting: getConfig('downloadSkipExisting'),
      downloadConcurrency: getConfig('downloadConcurrency'),
      downloadFileNamePattern: getConfig('downloadFileNamePattern'),
      downloadEmbedCover: getConfig('downloadEmbedCover'),
      downloadEmbedLyrics: getConfig('downloadEmbedLyrics'),
      downloadEmbedTranslatedLyrics: getConfig('downloadEmbedTranslatedLyrics'),
    }),
    openPath: async targetPath => {
      // shell.openPath 返回错误字符串，DownloadService 会把它转换成布尔结果。
      return electron.shell.openPath(targetPath)
    },
    showItemInFolder: targetPath => {
      electron.shell.showItemInFolder(targetPath)
    },
  })
}

/**
 * 创建下载 IPC 注册器。
 *
 * renderer 只发起任务命令和接收任务快照，真实下载、写文件、打开文件夹都留在主进程。
 */
export function createDownloadIpc(
  options: DownloadIpcRegistrationOptions = {}
) {
  const ipcMain = options.ipcMain ?? electron.ipcMain
  const dialog = options.dialog ?? electron.dialog
  const browserWindowFromWebContents =
    options.browserWindowFromWebContents ??
    ((webContents: unknown) =>
      electron.BrowserWindow.fromWebContents(
        webContents as Electron.WebContents
      ))
  const getAllWindows =
    options.getAllWindows ?? (() => electron.BrowserWindow.getAllWindows())
  const appGetPath =
    options.appGetPath ?? ((name: 'downloads') => electron.app.getPath(name))
  const downloadService =
    options.downloadService ?? createDefaultDownloadService(appGetPath)

  return {
    register() {
      downloadService.subscribe(tasks => {
        // 下载任务是跨页面共享状态，主进程广播完整快照让所有窗口保持一致。
        for (const window of getAllWindows()) {
          window.webContents.send(DOWNLOAD_IPC_CHANNELS.TASKS_CHANGED, tasks)
        }
      })

      ipcMain.handle(DOWNLOAD_IPC_CHANNELS.GET_DEFAULT_DIRECTORY, () => {
        return downloadService.getDefaultDirectory(getConfig('downloadDir'))
      })

      ipcMain.handle(DOWNLOAD_IPC_CHANNELS.SELECT_DIRECTORY, async event => {
        const window = browserWindowFromWebContents(
          (event as { sender: unknown }).sender
        )
        const result = await dialog.showOpenDialog(window, {
          title: 'Select Download Directory',
          defaultPath: downloadService.getDefaultDirectory(
            getConfig('downloadDir')
          ),
          properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
        })

        if (result.canceled || result.filePaths.length === 0) {
          return null
        }

        return result.filePaths[0] ?? null
      })

      ipcMain.handle(
        DOWNLOAD_IPC_CHANNELS.OPEN_DIRECTORY,
        async (_event, directory?: string) => {
          return downloadService.openDirectory(
            directory || getConfig('downloadDir')
          )
        }
      )

      ipcMain.handle(
        DOWNLOAD_IPC_CHANNELS.ENQUEUE_SONG_DOWNLOAD,
        async (_event, payload) => {
          return downloadService.enqueueSongDownload(
            payload as Parameters<DownloadService['enqueueSongDownload']>[0]
          )
        }
      )

      ipcMain.handle(DOWNLOAD_IPC_CHANNELS.GET_TASKS, () => {
        return downloadService.getTasks()
      })

      ipcMain.handle(
        DOWNLOAD_IPC_CHANNELS.HYDRATE_TASK_PLAYBACK_METADATA,
        async (_event, taskId) => {
          return downloadService.hydrateTaskPlaybackMetadata(taskId as string)
        }
      )

      ipcMain.handle(DOWNLOAD_IPC_CHANNELS.REMOVE_TASK, (_event, taskId) => {
        return downloadService.removeTask(taskId as string)
      })

      ipcMain.handle(
        DOWNLOAD_IPC_CHANNELS.OPEN_DOWNLOADED_FILE,
        async (_event, taskId) => {
          return downloadService.openDownloadedFile(taskId as string)
        }
      )

      ipcMain.handle(
        DOWNLOAD_IPC_CHANNELS.OPEN_DOWNLOADED_FILE_FOLDER,
        async (_event, taskId) => {
          return downloadService.openDownloadedFileFolder(taskId as string)
        }
      )
    },
  }
}

/** 注册下载 IPC 的生产入口。 */
export function registerDownloadIpc(
  options: DownloadIpcRegistrationOptions = {}
) {
  createDownloadIpc(options).register()
}
