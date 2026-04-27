import { useEffect, useMemo, useState } from 'react'
import { useScrollToTopOnRouteEnter } from '@/hooks/useScrollToTopOnRouteEnter'
import DownloadsPageView from './components/DownloadsPageView'
import { buildDownloadTaskPlaybackQueue } from './download-playback.model'
import { filterDownloadTasks } from './downloads.model'
import type { DownloadTaskFilterValue } from './types'
import { useDownloadTaskStore } from '@/stores/download-task-store'
import { usePlaybackStore } from '@/stores/playback-store'

const Downloads = () => {
  useScrollToTopOnRouteEnter()

  const [activeFilter, setActiveFilter] =
    useState<DownloadTaskFilterValue>('all')
  const tasks = useDownloadTaskStore(state => state.tasks)
  const startSubscription = useDownloadTaskStore(
    state => state.startSubscription
  )
  const stopSubscription = useDownloadTaskStore(state => state.stopSubscription)
  const playQueueFromIndex = usePlaybackStore(state => state.playQueueFromIndex)

  useEffect(() => {
    void startSubscription()

    return () => {
      stopSubscription()
    }
  }, [startSubscription, stopSubscription])

  const visibleTasks = useMemo(
    () => filterDownloadTasks(tasks, activeFilter),
    [activeFilter, tasks]
  )

  return (
    <DownloadsPageView
      activeFilter={activeFilter}
      tasks={visibleTasks}
      onFilterChange={setActiveFilter}
      onOpenFile={taskId => {
        void (async () => {
          await window.electronDownload
            .hydrateTaskPlaybackMetadata(taskId)
            .catch(() => null)
          const latestTasks = await useDownloadTaskStore
            .getState()
            .refreshTasks()
          const latestVisibleTasks = filterDownloadTasks(
            latestTasks,
            activeFilter
          )
          const queue = buildDownloadTaskPlaybackQueue(
            latestVisibleTasks,
            taskId
          )

          if (!queue.tracks.length) {
            return
          }

          playQueueFromIndex(queue.tracks, queue.startIndex)
        })()
      }}
      onOpenFolder={taskId => {
        void window.electronDownload.openDownloadedFileFolder(taskId)
      }}
      onRemoveTask={taskId => {
        void window.electronDownload.removeTask(taskId)
      }}
    />
  )
}

export default Downloads
