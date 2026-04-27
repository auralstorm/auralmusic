import type {
  DownloadTask,
  DownloadTaskFilterOption,
  DownloadTaskFilterValue,
  DownloadTaskStatus,
  DownloadTaskViewModel,
} from './types'

export const DOWNLOAD_TASK_FILTER_LABELS = {
  all: '所有任务',
  active: '队列中',
  failed: '下载失败',
  skipped: '已跳过',
  completed: '下载完成',
} as const

export const DOWNLOAD_TASK_STATUS_LABELS: Record<DownloadTaskStatus, string> = {
  queued: '队列中',
  downloading: '下载中',
  failed: '下载失败',
  skipped: '已跳过',
  completed: '下载完成',
}

const DOWNLOAD_TASK_QUALITY_LABELS: Record<string, string> = {
  standard: '标准',
  higher: '较高',
  exhigh: '极高',
  lossless: '无损',
  hires: 'Hi-Res',
  jyeffect: '高清环绕声',
  sky: '沉浸环绕声',
  dolby: '杜比全景声',
  jymaster: '超清母带',
  '128k': '标准',
  '320k': '较高',
  flac: '无损',
  flac24bit: 'Hi-Res',
}

export const DOWNLOAD_TASK_FILTERS: DownloadTaskFilterOption[] = [
  { value: 'all', label: DOWNLOAD_TASK_FILTER_LABELS.all },
  { value: 'active', label: DOWNLOAD_TASK_FILTER_LABELS.active },
  { value: 'failed', label: DOWNLOAD_TASK_FILTER_LABELS.failed },
  { value: 'skipped', label: DOWNLOAD_TASK_FILTER_LABELS.skipped },
  { value: 'completed', label: DOWNLOAD_TASK_FILTER_LABELS.completed },
]

export function getDownloadTaskStatusLabel(status: DownloadTaskStatus) {
  return DOWNLOAD_TASK_STATUS_LABELS[status]
}

export function getDownloadTaskQualityLabel(
  quality: string | null | undefined
) {
  const normalizedQuality = quality?.trim()
  if (!normalizedQuality) {
    return '-'
  }

  // 兼容历史任务记录中的旧音质值，避免升级后文案回退成内部编码。
  return DOWNLOAD_TASK_QUALITY_LABELS[normalizedQuality] || normalizedQuality
}

export function formatDownloadTaskFileSize(
  fileSizeBytes: number | null | undefined
) {
  if (
    typeof fileSizeBytes !== 'number' ||
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes < 0
  ) {
    return '-'
  }

  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = fileSizeBytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function filterDownloadTasks(
  tasks: DownloadTask[],
  filter: DownloadTaskFilterValue
) {
  if (filter === 'all') {
    return tasks
  }

  if (filter === 'active') {
    return tasks.filter(
      task => task.status === 'queued' || task.status === 'downloading'
    )
  }

  return tasks.filter(task => task.status === filter)
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) {
    return 0
  }

  return Math.min(100, Math.max(0, progress))
}

export function formatDownloadTaskProgress(task: DownloadTask) {
  if (task.status === 'queued') {
    return '等待中'
  }

  return `${Math.round(clampProgress(task.progress))}%`
}

export function canOpenDownloadTaskFile(task: DownloadTask) {
  return task.status === 'completed'
}

export function canOpenDownloadTaskFolder(task: DownloadTask) {
  return (
    task.status === 'completed' ||
    task.status === 'skipped' ||
    task.status === 'failed'
  )
}

export function buildDownloadTaskViewModels(
  tasks: DownloadTask[]
): DownloadTaskViewModel[] {
  return tasks.map(task => ({
    taskId: task.taskId,
    songName: task.songName,
    statusLabel: getDownloadTaskStatusLabel(task.status),
    progressLabel: formatDownloadTaskProgress(task),
    qualityLabel: getDownloadTaskQualityLabel(task.quality),
    fileSizeLabel: formatDownloadTaskFileSize(task.fileSizeBytes),
    canOpenFile: canOpenDownloadTaskFile(task),
    canOpenFolder: canOpenDownloadTaskFolder(task),
    canRemove: true,
  }))
}
