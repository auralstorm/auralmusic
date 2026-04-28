import { create } from 'zustand'

import type { DownloadTask as BridgeDownloadTask } from '../../shared/download.ts'
import type { DownloadTask } from '@/pages/Downloads/types'
import type { DownloadTaskStoreState } from '@/types/core'

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
    fileSizeBytes: task.fileSizeBytes,
    durationMs: task.durationMs,
    lyricText: task.lyricText,
    translatedLyricText: task.translatedLyricText,
  }
}

function normalizeDownloadTasks(
  tasks: Array<DownloadTask | BridgeDownloadTask>
): DownloadTask[] {
  return tasks.map(normalizeDownloadTask)
}

export function createDownloadTaskListener() {
  // 主进程推送完整列表时直接覆盖；只通知变更时回源拉取最新快照。
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
    // 下载任务列表，统一归一化为下载页展示结构。
    tasks: [],
    // 是否已完成首次任务同步，下载页用它区分空状态和加载中。
    initialized: false,
    // 主进程任务变更监听的取消函数，组件卸载时必须释放。
    unsubscribe: null,

    // 覆盖当前任务列表，并标记任务模块已初始化。
    setTasks: tasks => {
      set({
        tasks,
        initialized: true,
      })
    },

    // 主动从主进程拉取任务快照，用于首次进入和订阅事件缺省 payload 的兜底刷新。
    refreshTasks: async () => {
      const tasks = normalizeDownloadTasks(
        await window.electronDownload.getTasks()
      )
      get().setTasks(tasks)
      return tasks
    },

    // 开始监听主进程下载任务变化；重复启动前先释放旧订阅。
    startSubscription: async () => {
      get().stopSubscription()

      await get().refreshTasks()
      const listener = createDownloadTaskListener()
      const unsubscribe = window.electronDownload.onTasksChanged(listener)

      set({ unsubscribe })
    },

    // 停止监听下载任务变化，避免页面离开后继续写入无关状态。
    stopSubscription: () => {
      const { unsubscribe } = get()

      unsubscribe?.()
      set({ unsubscribe: null })
    },
  })
)
