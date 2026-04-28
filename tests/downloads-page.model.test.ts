import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canOpenDownloadTaskFile,
  canOpenDownloadTaskFolder,
  filterDownloadTasks,
  formatDownloadTaskFileSize,
  formatDownloadTaskProgress,
  getDownloadTaskStatusLabel,
} from '../src/renderer/pages/Downloads/downloads.model.ts'
import type {
  DownloadTask,
  DownloadTaskFilterValue,
} from '../src/renderer/pages/Downloads/downloads.types.ts'

function createTask(
  taskId: string,
  status: DownloadTask['status'],
  overrides: Partial<DownloadTask> = {}
): DownloadTask {
  return {
    taskId,
    songName: `song-${taskId}`,
    status,
    progress: 0,
    quality: '320k',
    ...overrides,
  }
}

test('filterDownloadTasks groups queueing states under 队列中 and preserves all-task view', () => {
  const tasks = [
    createTask('queued', 'queued'),
    createTask('downloading', 'downloading'),
    createTask('failed', 'failed'),
    createTask('skipped', 'skipped'),
    createTask('completed', 'completed'),
  ]

  const expectations: Record<DownloadTaskFilterValue, string[]> = {
    all: ['queued', 'downloading', 'failed', 'skipped', 'completed'],
    active: ['queued', 'downloading'],
    failed: ['failed'],
    skipped: ['skipped'],
    completed: ['completed'],
  }

  for (const [filter, expectedIds] of Object.entries(expectations)) {
    assert.deepEqual(
      filterDownloadTasks(tasks, filter as DownloadTaskFilterValue).map(
        task => task.taskId
      ),
      expectedIds
    )
  }
})

test('download task action guards and labels match business rules', () => {
  const queuedTask = createTask('queued', 'queued')
  const completedTask = createTask('completed', 'completed', { progress: 100 })
  const failedTask = createTask('failed', 'failed', { progress: 12 })
  const skippedTask = createTask('skipped', 'skipped')

  assert.equal(canOpenDownloadTaskFile(queuedTask), false)
  assert.equal(canOpenDownloadTaskFile(completedTask), true)

  assert.equal(canOpenDownloadTaskFolder(queuedTask), false)
  assert.equal(canOpenDownloadTaskFolder(completedTask), true)
  assert.equal(canOpenDownloadTaskFolder(failedTask), true)
  assert.equal(canOpenDownloadTaskFolder(skippedTask), true)

  assert.equal(getDownloadTaskStatusLabel('queued'), '队列中')
  assert.equal(getDownloadTaskStatusLabel('downloading'), '下载中')
  assert.equal(getDownloadTaskStatusLabel('failed'), '下载失败')
  assert.equal(getDownloadTaskStatusLabel('skipped'), '已跳过')
  assert.equal(getDownloadTaskStatusLabel('completed'), '下载完成')
})

test('formatDownloadTaskProgress handles pending, running and terminal states', () => {
  assert.equal(
    formatDownloadTaskProgress(createTask('queued', 'queued')),
    '等待中'
  )
  assert.equal(
    formatDownloadTaskProgress(
      createTask('downloading', 'downloading', { progress: 48.6 })
    ),
    '49%'
  )
  assert.equal(
    formatDownloadTaskProgress(
      createTask('completed', 'completed', { progress: 100 })
    ),
    '100%'
  )
  assert.equal(
    formatDownloadTaskProgress(
      createTask('failed', 'failed', { progress: 23 })
    ),
    '23%'
  )
})

test('formatDownloadTaskFileSize renders readable file sizes and empty fallback', () => {
  assert.equal(formatDownloadTaskFileSize(undefined), '-')
  assert.equal(formatDownloadTaskFileSize(null), '-')
  assert.equal(formatDownloadTaskFileSize(-1), '-')
  assert.equal(formatDownloadTaskFileSize(512), '512 B')
  assert.equal(formatDownloadTaskFileSize(1536), '1.50 KB')
  assert.equal(formatDownloadTaskFileSize(10 * 1024 * 1024), '10.0 MB')
  assert.equal(formatDownloadTaskFileSize(128 * 1024 * 1024), '128 MB')
})
