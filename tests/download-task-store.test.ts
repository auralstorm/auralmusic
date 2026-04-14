import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createDownloadTaskListener,
  useDownloadTaskStore,
} from '../src/renderer/stores/download-task-store.ts'

type MockDownloadTask = {
  taskId: string
  songId?: number | string
  songName: string
  artistName?: string
  coverUrl?: string
  albumName?: string | null
  targetPath?: string
  status: 'queued' | 'downloading' | 'completed' | 'failed' | 'skipped'
  progress: number
  quality: string
}

function createTask(taskId: string, overrides: Partial<MockDownloadTask> = {}) {
  return {
    taskId,
    songName: `${taskId}-song`,
    status: 'queued' as const,
    progress: 0,
    quality: '320k',
    ...overrides,
  }
}

function resetStore() {
  useDownloadTaskStore.getState().stopSubscription()
  useDownloadTaskStore.setState({
    tasks: [],
    initialized: false,
    unsubscribe: null,
  })
}

test('download task store refreshes tasks from electron bridge', async () => {
  resetStore()

  const tasks = [
    createTask('task-1', {
      songId: 1001,
      artistName: 'Artist 1',
      coverUrl: 'cover-1.jpg',
      albumName: 'Album 1',
      targetPath: 'F:\\downloads\\task-1.mp3',
      status: 'downloading',
      progress: 48,
    }),
  ]

  globalThis.window = Object.assign(globalThis.window ?? {}, {
    electronDownload: {
      getTasks: async () => tasks,
      onTasksChanged: () => () => undefined,
      removeTask: async () => undefined,
      openDownloadedFile: async () => undefined,
      openDownloadedFileFolder: async () => undefined,
    },
  }) as Window & typeof globalThis

  await useDownloadTaskStore.getState().refreshTasks()

  assert.equal(useDownloadTaskStore.getState().initialized, true)
  assert.deepEqual(useDownloadTaskStore.getState().tasks, tasks)
  assert.equal(
    useDownloadTaskStore.getState().tasks[0]?.targetPath,
    tasks[0]?.targetPath
  )
})

test('download task store subscribes to task changes and replaces stale listeners', async () => {
  resetStore()

  let currentTasks = [createTask('task-1', { status: 'queued' })]
  let unsubscribeCount = 0
  let listener: (() => void) | null = null

  globalThis.window = Object.assign(globalThis.window ?? {}, {
    electronDownload: {
      getTasks: async () => currentTasks,
      onTasksChanged: (nextListener: () => void) => {
        listener = nextListener
        return () => {
          unsubscribeCount += 1
        }
      },
      removeTask: async () => undefined,
      openDownloadedFile: async () => undefined,
      openDownloadedFileFolder: async () => undefined,
    },
  }) as Window & typeof globalThis

  await useDownloadTaskStore.getState().startSubscription()
  currentTasks = [createTask('task-2', { status: 'completed', progress: 100 })]
  await listener?.()

  assert.deepEqual(useDownloadTaskStore.getState().tasks, currentTasks)

  await useDownloadTaskStore.getState().startSubscription()
  assert.equal(unsubscribeCount, 1)

  useDownloadTaskStore.getState().stopSubscription()
  assert.equal(unsubscribeCount, 2)
  assert.equal(useDownloadTaskStore.getState().unsubscribe, null)
})

test('createDownloadTaskListener refreshes snapshot when bridge emits changes', async () => {
  resetStore()

  const firstTasks = [createTask('task-1', { status: 'queued' })]
  const nextTasks = [createTask('task-1', { status: 'failed', progress: 17 })]
  let callCount = 0

  globalThis.window = Object.assign(globalThis.window ?? {}, {
    electronDownload: {
      getTasks: async () => {
        callCount += 1
        return callCount === 1 ? firstTasks : nextTasks
      },
      onTasksChanged: () => () => undefined,
      removeTask: async () => undefined,
      openDownloadedFile: async () => undefined,
      openDownloadedFileFolder: async () => undefined,
    },
  }) as Window & typeof globalThis

  await useDownloadTaskStore.getState().refreshTasks()
  await createDownloadTaskListener()()

  assert.deepEqual(useDownloadTaskStore.getState().tasks, nextTasks)
})
