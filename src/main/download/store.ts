import ElectronStore from 'electron-store'
import { resolveAppStoreDirectory } from '../storage/store-path.ts'

import type { DownloadTask } from './download-types.ts'

interface DownloadStoreSchema {
  tasks: DownloadTask[]
}

const Store =
  (
    ElectronStore as typeof ElectronStore & {
      default?: typeof ElectronStore
    }
  ).default ?? ElectronStore

/** 构建下载任务持久化配置，统一存放在 Electron userData 目录。 */
export function buildDownloadStoreOptions(
  resolveStoreDirectory: () => string = resolveAppStoreDirectory
) {
  return {
    cwd: resolveStoreDirectory(),
    name: 'aural-music-downloads',
    defaults: {
      tasks: [],
    },
  }
}

function createDownloadStore() {
  return new Store<DownloadStoreSchema>(buildDownloadStoreOptions())
}

/** 下载任务 store 单例，避免多个 electron-store 实例同时写入 tasks。 */
class DownloadStore {
  private static instance: ReturnType<typeof createDownloadStore>

  private constructor() {}

  static getInstance(): ReturnType<typeof createDownloadStore> {
    if (!DownloadStore.instance) {
      DownloadStore.instance = createDownloadStore()
    }

    return DownloadStore.instance
  }
}

function getDownloadStore() {
  return DownloadStore.getInstance()
}

/** 读取持久化下载任务，服务启动时用于恢复任务列表。 */
export function getPersistedDownloadTasks() {
  return getDownloadStore().get('tasks') || []
}

/** 写入下载任务快照，DownloadService 每次状态变化后调用。 */
export function setPersistedDownloadTasks(tasks: DownloadTask[]) {
  getDownloadStore().set('tasks', tasks)
}
