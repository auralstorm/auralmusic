export const UPDATE_STATUS = [
  'idle',
  'checking',
  'update-available',
  'downloading',
  'update-downloaded',
  'up-to-date',
  'error',
] as const

export type UpdateStatus = (typeof UPDATE_STATUS)[number]

export const UPDATE_ACTION_MODES = ['install', 'external-link'] as const

export type UpdateActionMode = (typeof UPDATE_ACTION_MODES)[number]

export const UPDATE_TRIGGERS = ['auto', 'manual'] as const

export type UpdateTrigger = (typeof UPDATE_TRIGGERS)[number]

export interface AppUpdateSnapshot {
  status: UpdateStatus
  currentVersion: string
  latestVersion: string | null
  releaseNotes: string
  releaseDate: string | null
  releaseUrl: string | null
  actionMode: UpdateActionMode
  downloadProgress: number
  downloadedBytes: number
  totalBytes: number
  errorMessage: string | null
  lastCheckedAt: string | null
  lastTrigger: UpdateTrigger | null
}
