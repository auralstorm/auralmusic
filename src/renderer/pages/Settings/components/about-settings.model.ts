import type { AppUpdateSnapshot } from '../../../../shared/update.ts'

export const ABOUT_UP_TO_DATE_MESSAGE = '当前已是最新版'
export const ABOUT_UPDATE_FAILED_MESSAGE = '检查更新失败，请稍后重试'
export const ABOUT_UPDATE_PREVIEW_BUTTON_LABEL = '预览更新弹窗'

export const ABOUT_USAGE_NOTICE_LINES = [
  '本项目仅供个人技术学习，禁止任何侵权、非法二次分发与商用。',
  '任何使用者利用本工具实施的侵权行为，均与本项目开发者无关。',
  '如存在版权争议，请联系相关音源平台下架处理。',
  '请务必通过官方正版渠道购买会员、合法收听，共同维护良好音乐版权环境。',
] as const

const ABOUT_UPDATE_PREVIEW_RELEASE_NOTES = `
<ol>
  <li>优化渲染性能</li>
  <li>重构 <code>MV</code> 播放器</li>
  <li>增加虚拟滚动，提升性能</li>
  <li>增加淡入淡出播放</li>
</ol>
`.trim()

function resolveAboutUpdatePreviewVersion(currentVersion: string) {
  const normalizedVersion = currentVersion.trim()
  const match = normalizedVersion.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/)

  if (!match) {
    return '9.9.9'
  }

  const [, major, minor, patch] = match
  return `${major}.${minor}.${Number.parseInt(patch, 10) + 1}`
}

export function resolveAboutVersionLabel(version: string | undefined | null) {
  const normalizedVersion = version?.trim()
  return normalizedVersion ? `v${normalizedVersion}` : '版本未知'
}

export function resolveAboutVersionSummary({
  appVersion,
  latestVersion,
}: {
  appVersion: string | undefined | null
  latestVersion: string | undefined | null
}) {
  const currentLabel = resolveAboutVersionLabel(appVersion)
  const latestLabel =
    latestVersion && latestVersion.trim()
      ? resolveAboutVersionLabel(latestVersion)
      : null

  return {
    currentLabel,
    latestLabel,
  }
}

export function resolveCheckUpdateButtonLabel(snapshot: AppUpdateSnapshot) {
  switch (snapshot.status) {
    case 'checking':
      return '检查中...'
    case 'update-downloaded':
    case 'update-available':
    case 'downloading':
      return '查看更新'
    default:
      return '检查更新'
  }
}

export function resolveUpdateFailureMessage(snapshot: AppUpdateSnapshot) {
  return snapshot.errorMessage?.trim() || ABOUT_UPDATE_FAILED_MESSAGE
}

export function createAboutUpdatePreviewSnapshot({
  currentVersion,
  platform,
}: {
  currentVersion: string
  platform: NodeJS.Platform
}): AppUpdateSnapshot {
  return {
    status: 'update-available',
    currentVersion,
    latestVersion: resolveAboutUpdatePreviewVersion(currentVersion),
    releaseNotes: ABOUT_UPDATE_PREVIEW_RELEASE_NOTES,
    releaseDate: new Date().toISOString().slice(0, 10),
    releaseUrl: 'https://github.com/auralstorm/auralmusic/releases/latest',
    actionMode: platform === 'linux' ? 'external-link' : 'install',
    downloadProgress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    errorMessage: null,
    lastCheckedAt: new Date().toISOString(),
    lastTrigger: 'manual',
  }
}

type HandleAboutCheckForUpdatesOptions = {
  snapshot: AppUpdateSnapshot
  checkForUpdates: () => Promise<AppUpdateSnapshot>
  openUpdateModal: () => void
  showUpToDateMessage: () => void
  showErrorMessage: (message: string) => void
}

export async function handleAboutCheckForUpdates({
  snapshot,
  checkForUpdates,
  openUpdateModal,
  showUpToDateMessage,
  showErrorMessage,
}: HandleAboutCheckForUpdatesOptions) {
  if (
    snapshot.status === 'downloading' ||
    snapshot.status === 'update-downloaded'
  ) {
    openUpdateModal()
    return snapshot
  }

  const nextSnapshot = await checkForUpdates()

  if (
    nextSnapshot.status === 'update-available' ||
    nextSnapshot.status === 'update-downloaded'
  ) {
    openUpdateModal()
    return nextSnapshot
  }

  if (nextSnapshot.status === 'up-to-date') {
    showUpToDateMessage()
    return nextSnapshot
  }

  if (nextSnapshot.status === 'error') {
    showErrorMessage(resolveUpdateFailureMessage(nextSnapshot))
  }

  return nextSnapshot
}
