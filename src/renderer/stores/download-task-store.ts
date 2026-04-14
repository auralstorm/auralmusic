import { create } from 'zustand'

import type { DownloadTask as BridgeDownloadTask } from '../../main/download/download-types'
import type { DownloadTask } from '@/pages/Downloads/downloads.types'

type DownloadTaskUnsubscribe = (() => void) | null

interface DownloadTaskStoreState {
  tasks: DownloadTask[]
  initialized: boolean
  unsubscribe: DownloadTaskUnsubscribe
  setTasks: (tasks: DownloadTask[]) => void
  refreshTasks: () => Promise<DownloadTask[]>
  startSubscription: () => Promise<void>
  stopSubscription: () => void
}

function normalizeDownloadTask(
  task: DownloadTask | BridgeDownloadTask
): DownloadTask {
  if ('taskId' in task) {
    return task
  }

  return {
    taskId: task.id,
    songId: task.songId,
    songName: task.songName,
    artistName: task.artistName,
    coverUrl: task.coverUrl,
    albumName: task.albumName,
    targetPath: task.targetPath,
    status: task.status,
    progress: task.progress,
    quality: task.resolvedQuality || task.requestedQuality || '-',
  }
}

function normalizeDownloadTasks(
  tasks: Array<DownloadTask | BridgeDownloadTask>
): DownloadTask[] {
  return tasks.map(normalizeDownloadTask)
}

export function createDownloadTaskListener() {
  return async (tasks?: BridgeDownloadTask[]) => {
    if (tasks) {
      useDownloadTaskStore.getState().setTasks(normalizeDownloadTasks(tasks))
      return
    }

    await useDownloadTaskStore.getState().refreshTasks()
  }
}

export const useDownloadTaskStore = create<DownloadTaskStoreState>(
  (set, get) => ({
    tasks: [],
    initialized: false,
    unsubscribe: null,

    setTasks: tasks => {
      set({
        tasks,
        initialized: true,
      })
    },

    refreshTasks: async () => {
      const tasks = normalizeDownloadTasks(
        await window.electronDownload.getTasks()
      )
      get().setTasks(tasks)
      return tasks
    },

    startSubscription: async () => {
      get().stopSubscription()

      await get().refreshTasks()
      const listener = createDownloadTaskListener()
      const unsubscribe = window.electronDownload.onTasksChanged(listener)

      set({ unsubscribe })
    },

    stopSubscription: () => {
      const { unsubscribe } = get()

      unsubscribe?.()
      set({ unsubscribe: null })
    },
  })
)
