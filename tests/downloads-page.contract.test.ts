import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DOWNLOAD_TASK_FILTERS,
  buildDownloadTaskViewModels,
} from '../src/renderer/pages/Downloads/downloads.model.ts'
import type { DownloadTask } from '../src/renderer/pages/Downloads/downloads.types.ts'

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

test('download page exposes the required filter tabs in the expected order', () => {
  assert.deepEqual(
    DOWNLOAD_TASK_FILTERS.map(filter => ({
      value: filter.value,
      label: filter.label,
    })),
    [
      { value: 'all', label: '所有任务' },
      { value: 'active', label: '队列中' },
      { value: 'failed', label: '下载失败' },
      { value: 'skipped', label: '已跳过' },
      { value: 'completed', label: '下载完成' },
    ]
  )
})

test('buildDownloadTaskViewModels exposes per-row action availability for the page', () => {
  const rows = buildDownloadTaskViewModels([
    createTask('completed', 'completed', { progress: 100, quality: 'flac' }),
    createTask('failed', 'failed', { progress: 23 }),
    createTask('queued', 'queued'),
  ])

  assert.deepEqual(rows, [
    {
      taskId: 'completed',
      songName: 'song-completed',
      statusLabel: '下载完成',
      progressLabel: '100%',
      qualityLabel: '无损',
      fileSizeLabel: '-',
      canOpenFile: true,
      canOpenFolder: true,
      canRemove: true,
    },
    {
      taskId: 'failed',
      songName: 'song-failed',
      statusLabel: '下载失败',
      progressLabel: '23%',
      qualityLabel: '较高',
      fileSizeLabel: '-',
      canOpenFile: false,
      canOpenFolder: true,
      canRemove: true,
    },
    {
      taskId: 'queued',
      songName: 'song-queued',
      statusLabel: '队列中',
      progressLabel: '等待中',
      qualityLabel: '较高',
      fileSizeLabel: '-',
      canOpenFile: false,
      canOpenFolder: false,
      canRemove: true,
    },
  ])
})
