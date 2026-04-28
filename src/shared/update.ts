/** 更新服务状态枚举，renderer 根据该状态渲染检查、下载、安装和错误 UI。 */
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

/** 更新动作模式：可自动安装的平台走 install，Linux 等平台打开外部发布页。 */
export const UPDATE_ACTION_MODES = ['install', 'external-link'] as const

export type UpdateActionMode = (typeof UPDATE_ACTION_MODES)[number]

/** 区分自动检查和用户手动检查，便于 UI/日志解释更新触发来源。 */
export const UPDATE_TRIGGERS = ['auto', 'manual'] as const

export type UpdateTrigger = (typeof UPDATE_TRIGGERS)[number]

/** 自动更新状态快照，由 main 维护并广播给 renderer。 */
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
