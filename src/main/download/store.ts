import ElectronStore from 'electron-store'

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

function createDownloadStore() {
  return new Store<DownloadStoreSchema>({
    cwd: process.cwd(),
    name: 'aural-music-downloads',
    defaults: {
      tasks: [],
    },
  })
}

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

const downloadStore = DownloadStore.getInstance()

export function getPersistedDownloadTasks() {
  return downloadStore.get('tasks') || []
}

export function setPersistedDownloadTasks(tasks: DownloadTask[]) {
  downloadStore.set('tasks', tasks)
}
