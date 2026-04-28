import electron from 'electron'

import {
  type DownloadTask,
  type SongDownloadPayload,
} from '../../shared/download.ts'
import { DOWNLOAD_IPC_CHANNELS } from '../../shared/ipc/index.ts'

export type DownloadApi = {
  /** 获取默认下载目录，供设置页展示和任务创建时兜底。 */
  getDefaultDirectory: () => Promise<string>
  /** 打开系统目录选择器，返回用户选择的下载目录；取消选择时返回 null。 */
  selectDirectory: () => Promise<string | null>
  /** 打开下载目录；未传目录时由主进程打开当前配置目录。 */
  openDirectory: (directory?: string) => Promise<boolean>
  /** 创建单曲下载任务，并由主进程加入下载队列。 */
  enqueueSongDownload: (payload: SongDownloadPayload) => Promise<DownloadTask>
  /** 获取当前所有下载任务快照。 */
  getTasks: () => Promise<DownloadTask[]>
  /** 为指定下载任务补齐播放所需的元数据，常用于下载完成后的本地播放入口。 */
  hydrateTaskPlaybackMetadata: (taskId: string) => Promise<DownloadTask | null>
  /** 从任务列表移除指定任务；是否删除文件由主进程规则决定。 */
  removeTask: (taskId: string) => Promise<boolean>
  /** 使用系统默认应用打开已下载文件。 */
  openDownloadedFile: (taskId: string) => Promise<boolean>
  /** 在系统文件管理器中定位已下载文件。 */
  openDownloadedFileFolder: (taskId: string) => Promise<boolean>
  /** 订阅下载任务列表变化；返回取消函数，避免页面切换后重复监听。 */
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

/**
 * 创建下载桥接 API。
 *
 * 下载过程包含网络请求、文件写入和系统打开文件能力，preload 只提供业务级命令，
 * 不向 renderer 暴露 Node 文件系统或 Electron shell。
 */
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
      // 主进程广播的是完整任务快照，renderer store 可以直接替换本地列表，避免补丁同步复杂度。
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
      // 统一挂载到 window.electronDownload，方便类型声明和业务层依赖收敛。
      bridge.exposeInMainWorld('electronDownload', api)
    },
  }
}

export function exposeDownloadApi() {
  createDownloadApi().expose()
}
