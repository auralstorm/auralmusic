import electron from 'electron'

import {
  type DownloadTask,
  type SongDownloadPayload,
} from '../../shared/download.ts'
import { DOWNLOAD_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type DownloadApi = {
  getDefaultDirectory: () => Promise<string>
  selectDirectory: () => Promise<string | null>
  openDirectory: (directory?: string) => Promise<boolean>
  enqueueSongDownload: (payload: SongDownloadPayload) => Promise<DownloadTask>
  getTasks: () => Promise<DownloadTask[]>
  hydrateTaskPlaybackMetadata: (taskId: string) => Promise<DownloadTask | null>
  removeTask: (taskId: string) => Promise<boolean>
  openDownloadedFile: (taskId: string) => Promise<boolean>
  openDownloadedFileFolder: (taskId: string) => Promise<boolean>
  onTasksChanged: (listener: (tasks: DownloadTask[]) => void) => () => void
}

type DownloadApiDependencies = {
  contextBridge?: {
    exposeInMainWorld: (key: string, value: unknown) => void
  }
  ipcRenderer?: {
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
    on: (channel: string, listener: (...args: unknown[]) => void) => void
    removeListener: (
      channel: string,
      listener: (...args: unknown[]) => void
    ) => void
  }
}

export function createDownloadApi(dependencies: DownloadApiDependencies = {}) {
  const bridge = dependencies.contextBridge ?? electron.contextBridge
  const renderer = dependencies.ipcRenderer ?? electron.ipcRenderer

  const api: DownloadApi = {
    getDefaultDirectory: async () => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.GET_DEFAULT_DIRECTORY
      ) as Promise<string>
    },
    selectDirectory: async () => {
      return renderer.invoke(DOWNLOAD_IPC_CHANNELS.SELECT_DIRECTORY) as Promise<
        string | null
      >
    },
    openDirectory: async directory => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.OPEN_DIRECTORY,
        directory
      ) as Promise<boolean>
    },
    enqueueSongDownload: async payload => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.ENQUEUE_SONG_DOWNLOAD,
        payload
      ) as Promise<DownloadTask>
    },
    getTasks: async () => {
      return renderer.invoke(DOWNLOAD_IPC_CHANNELS.GET_TASKS) as Promise<
        DownloadTask[]
      >
    },
    hydrateTaskPlaybackMetadata: async taskId => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.HYDRATE_TASK_PLAYBACK_METADATA,
        taskId
      ) as Promise<DownloadTask | null>
    },
    removeTask: async taskId => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.REMOVE_TASK,
        taskId
      ) as Promise<boolean>
    },
    openDownloadedFile: async taskId => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.OPEN_DOWNLOADED_FILE,
        taskId
      ) as Promise<boolean>
    },
    openDownloadedFileFolder: async taskId => {
      return renderer.invoke(
        DOWNLOAD_IPC_CHANNELS.OPEN_DOWNLOADED_FILE_FOLDER,
        taskId
      ) as Promise<boolean>
    },
    onTasksChanged: listener => {
      const ipcListener = (_event: unknown, tasks: unknown) => {
        listener((tasks as DownloadTask[]) || [])
      }

      renderer.on(DOWNLOAD_IPC_CHANNELS.TASKS_CHANGED, ipcListener)

      return () => {
        renderer.removeListener(
          DOWNLOAD_IPC_CHANNELS.TASKS_CHANGED,
          ipcListener
        )
      }
    },
  }

  return {
    api,
    expose() {
      bridge.exposeInMainWorld('electronDownload', api)
    },
  }
}

export function exposeDownloadApi() {
  createDownloadApi().expose()
}
