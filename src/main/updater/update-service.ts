import { shell } from 'electron'
import {
  autoUpdater,
  type ProgressInfo,
  type UpdateDownloadedEvent,
  type UpdateInfo,
} from 'electron-updater'

import type {
  AppUpdateSnapshot,
  UpdateActionMode,
  UpdateTrigger,
} from '../../shared/update.ts'

const DEFAULT_AUTO_CHECK_DELAY_MS = 3000

type UpdateServiceOptions = {
  platform: NodeJS.Platform
  currentVersion: string
  owner: string
  repo: string
  enabled: boolean
  autoCheckDelayMs?: number
}

type UpdateSnapshotListener = (snapshot: AppUpdateSnapshot) => void

function resolveActionMode(platform: NodeJS.Platform): UpdateActionMode {
  return platform === 'linux' ? 'external-link' : 'install'
}

function normalizeReleaseNotes(
  releaseNotes:
    | UpdateInfo['releaseNotes']
    | UpdateDownloadedEvent['releaseNotes']
) {
  if (typeof releaseNotes === 'string') {
    return releaseNotes.trim()
  }

  if (!Array.isArray(releaseNotes)) {
    return ''
  }

  return releaseNotes
    .map(note => {
      const versionText = note.version ? `v${note.version}` : ''
      const noteBody =
        typeof note.note === 'string'
          ? note.note.trim()
          : String(note.note ?? '')

      return [versionText, noteBody].filter(Boolean).join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

function normalizeReleaseDate(publishDate: string | null | undefined) {
  const normalized = publishDate?.trim()
  if (!normalized) {
    return null
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return normalized
  }

  return parsed.toISOString().slice(0, 10)
}

function createReleaseUrl({
  owner,
  repo,
  version,
}: {
  owner: string
  repo: string
  version: string | null
}) {
  if (!version) {
    return `https://github.com/${owner}/${repo}/releases/latest`
  }

  return `https://github.com/${owner}/${repo}/releases/tag/v${version}`
}

function createInitialSnapshot(
  options: Pick<
    UpdateServiceOptions,
    'platform' | 'currentVersion' | 'owner' | 'repo'
  >
): AppUpdateSnapshot {
  return {
    status: 'idle',
    currentVersion: options.currentVersion,
    latestVersion: null,
    releaseNotes: '',
    releaseDate: null,
    releaseUrl: createReleaseUrl({
      owner: options.owner,
      repo: options.repo,
      version: null,
    }),
    actionMode: resolveActionMode(options.platform),
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    errorMessage: null,
    lastCheckedAt: null,
    lastTrigger: null,
  }
}

export function createUpdateService(options: UpdateServiceOptions) {
  let snapshot = createInitialSnapshot(options)
  let autoCheckTimer: NodeJS.Timeout | null = null
  let initialized = false
  const listeners = new Set<UpdateSnapshotListener>()

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.fullChangelog = true

  const emitSnapshot = () => {
    const nextSnapshot = { ...snapshot }
    listeners.forEach(listener => {
      listener(nextSnapshot)
    })
  }

  const setSnapshot = (
    partial:
      | Partial<AppUpdateSnapshot>
      | ((current: AppUpdateSnapshot) => AppUpdateSnapshot)
  ) => {
    snapshot =
      typeof partial === 'function'
        ? partial(snapshot)
        : {
            ...snapshot,
            ...partial,
          }

    emitSnapshot()
    return snapshot
  }

  const syncReleaseInfo = (
    updateInfo: UpdateInfo | UpdateDownloadedEvent,
    extra: Partial<AppUpdateSnapshot> = {}
  ) => {
    const releaseDate =
      normalizeReleaseDate(
        (
          updateInfo as UpdateInfo & {
            publishDate?: string | null
            releaseDate?: string | null
          }
        ).publishDate ??
          (
            updateInfo as UpdateInfo & {
              publishDate?: string | null
              releaseDate?: string | null
            }
          ).releaseDate
      ) ?? null

    return setSnapshot(current => ({
      ...current,
      latestVersion: updateInfo.version ?? current.latestVersion,
      releaseNotes:
        normalizeReleaseNotes(updateInfo.releaseNotes) || current.releaseNotes,
      releaseDate: releaseDate ?? current.releaseDate,
      releaseUrl: createReleaseUrl({
        owner: options.owner,
        repo: options.repo,
        version: updateInfo.version ?? current.latestVersion,
      }),
      ...extra,
    }))
  }

  const bindAutoUpdaterEvents = () => {
    autoUpdater.on('checking-for-update', () => {
      setSnapshot(current => ({
        ...current,
        status: 'checking',
        errorMessage: null,
      }))
    })

    autoUpdater.on('update-available', updateInfo => {
      syncReleaseInfo(updateInfo, {
        status: 'update-available',
        actionMode: resolveActionMode(options.platform),
        errorMessage: null,
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
      })
    })

    autoUpdater.on('update-not-available', updateInfo => {
      syncReleaseInfo(updateInfo, {
        status: 'up-to-date',
        errorMessage: null,
        downloadProgress: 0,
        downloadedBytes: 0,
        totalBytes: 0,
        latestVersion: updateInfo.version ?? snapshot.currentVersion,
      })
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      setSnapshot(current => ({
        ...current,
        status: 'downloading',
        errorMessage: null,
        downloadProgress: progress.percent,
        downloadedBytes: progress.transferred,
        totalBytes: progress.total,
      }))
    })

    autoUpdater.on('update-downloaded', updateInfo => {
      syncReleaseInfo(updateInfo, {
        status: 'update-downloaded',
        errorMessage: null,
        downloadProgress: 100,
      })
    })

    autoUpdater.on('error', error => {
      setSnapshot(current => ({
        ...current,
        status: 'error',
        errorMessage: error.message || '检查或下载更新失败',
      }))
    })
  }

  const getSnapshot = () => ({ ...snapshot })

  const markUnsupported = () => {
    return setSnapshot(current => ({
      ...current,
      status: 'error',
      errorMessage: '开发环境暂不支持检查更新',
    }))
  }

  const checkForUpdates = async (
    trigger: UpdateTrigger
  ): Promise<AppUpdateSnapshot> => {
    if (!options.enabled) {
      return markUnsupported()
    }

    if (snapshot.status === 'checking' || snapshot.status === 'downloading') {
      return getSnapshot()
    }

    setSnapshot(current => ({
      ...current,
      status: 'checking',
      errorMessage: null,
      lastCheckedAt: new Date().toISOString(),
      lastTrigger: trigger,
    }))

    try {
      await autoUpdater.checkForUpdates()
      return getSnapshot()
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : '检查更新失败，请稍后重试'

      return setSnapshot(current => ({
        ...current,
        status: 'error',
        errorMessage: nextError,
      }))
    }
  }

  const startUpdate = async (): Promise<AppUpdateSnapshot> => {
    if (!options.enabled) {
      return markUnsupported()
    }

    if (options.platform === 'linux') {
      await openDownloadPage()
      return getSnapshot()
    }

    if (
      snapshot.status === 'downloading' ||
      snapshot.status === 'update-downloaded'
    ) {
      return getSnapshot()
    }

    if (snapshot.status !== 'update-available') {
      return getSnapshot()
    }

    setSnapshot(current => ({
      ...current,
      status: 'downloading',
      errorMessage: null,
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
    }))

    try {
      await autoUpdater.downloadUpdate()
      return getSnapshot()
    } catch (error) {
      const nextError =
        error instanceof Error ? error.message : '下载更新失败，请稍后重试'

      return setSnapshot(current => ({
        ...current,
        status: 'error',
        errorMessage: nextError,
      }))
    }
  }

  const restartAndInstall = async () => {
    if (!options.enabled || options.platform === 'linux') {
      return
    }

    autoUpdater.quitAndInstall(false, true)
  }

  const openDownloadPage = async () => {
    const targetUrl =
      snapshot.releaseUrl ??
      createReleaseUrl({
        owner: options.owner,
        repo: options.repo,
        version: snapshot.latestVersion,
      })

    await shell.openExternal(targetUrl)
  }

  const scheduleAutoCheck = () => {
    if (!options.enabled) {
      return
    }

    if (autoCheckTimer) {
      clearTimeout(autoCheckTimer)
    }

    autoCheckTimer = setTimeout(() => {
      void checkForUpdates('auto')
    }, options.autoCheckDelayMs ?? DEFAULT_AUTO_CHECK_DELAY_MS)
  }

  const initialize = () => {
    if (initialized) {
      return
    }

    initialized = true
    bindAutoUpdaterEvents()
  }

  const subscribe = (listener: UpdateSnapshotListener) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  return {
    initialize,
    subscribe,
    getSnapshot,
    checkForUpdates,
    startUpdate,
    restartAndInstall,
    openDownloadPage,
    scheduleAutoCheck,
  }
}

export type UpdateService = ReturnType<typeof createUpdateService>
