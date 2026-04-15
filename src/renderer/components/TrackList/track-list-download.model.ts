import type { SongDownloadPayload } from '../../../main/download/download-types'
import {
  createDownloadSourceResolver,
  type DownloadResolutionPolicy,
  type ResolvedDownloadSource,
} from '../../services/download/download-source-resolver.ts'

export const TRACK_DOWNLOAD_TOASTS = {
  disabled: '下载功能未开启，请先在设置中打开',
  unavailable: '下载能力暂不可用，请稍后重试',
  enqueued: '已加入下载队列',
  enqueueFailed: '加入下载队列失败，请稍后重试',
  sourceResolutionFailed: '无法解析下载源，歌曲未加入队列，请稍后重试',
} as const

const defaultResolveDownloadSource = createDownloadSourceResolver()

export interface TrackListDownloadSong {
  artists?: Array<{ name: string }> | null
  id: number
  coverUrl?: string
  name: string
  artistNames?: string
  duration: number
  albumName?: string
}

type TrackDownloadSource = {
  id: number
  name: string
  artistNames: string
  albumName: string
  coverUrl: string
  duration: number
}

type ResolveDownloadSourceInput = {
  track: TrackDownloadSource
  requestedQuality: SongDownloadPayload['requestedQuality']
  policy: DownloadResolutionPolicy
}

type ResolveDownloadSource = (
  input: ResolveDownloadSourceInput
) => Promise<ResolvedDownloadSource | null>

function formatArtistNames(artists?: Array<{ name: string }> | null) {
  if (!artists?.length) {
    return ''
  }

  return artists.map(artist => artist.name).join(' / ')
}

function buildTrackDownloadSource(
  item: TrackListDownloadSong,
  fallbackCoverUrl?: string
): TrackDownloadSource {
  return {
    id: item.id,
    name: item.name,
    artistNames:
      item.artistNames || formatArtistNames(item.artists) || '未知歌手',
    albumName: item.albumName || '',
    coverUrl: item.coverUrl || fallbackCoverUrl || '',
    duration: item.duration,
  }
}

export function buildTrackDownloadContext(
  item: TrackListDownloadSong,
  fallbackCoverUrl?: string
): SongDownloadPayload | null {
  if (!item.id || !item.name) {
    return null
  }

  const trackSource = buildTrackDownloadSource(item, fallbackCoverUrl)

  return {
    songId: trackSource.id,
    songName: trackSource.name,
    artistName: trackSource.artistNames,
    coverUrl: trackSource.coverUrl,
    albumName: item.albumName,
    requestedQuality: 'higher',
  }
}

export async function handleTrackDownload(options: {
  item: TrackListDownloadSong
  coverUrl?: string
  requestedQuality?: SongDownloadPayload['requestedQuality']
  downloadEnabled: boolean
  resolveDownloadSource?: ResolveDownloadSource
  enqueueSongDownload: (payload: SongDownloadPayload) => Promise<unknown>
  toastError: (message: string) => void
}) {
  if (!options.downloadEnabled) {
    options.toastError(TRACK_DOWNLOAD_TOASTS.disabled)
    return false
  }

  const context = buildTrackDownloadContext(options.item, options.coverUrl)
  if (!context) {
    return false
  }

  const requestedQuality = options.requestedQuality || context.requestedQuality
  const resolveDownloadSource =
    options.resolveDownloadSource ?? defaultResolveDownloadSource
  const resolvedSource = await resolveDownloadSource({
    track: buildTrackDownloadSource(options.item, options.coverUrl),
    requestedQuality,
    policy: 'fallback',
  })

  if (!resolvedSource?.url) {
    options.toastError(TRACK_DOWNLOAD_TOASTS.sourceResolutionFailed)
    return false
  }

  const enqueuePayload: SongDownloadPayload = {
    ...context,
    requestedQuality,
    sourceUrl: resolvedSource.url,
    resolvedQuality: resolvedSource.quality,
    sourceProvider: resolvedSource.provider,
    fileExtension: resolvedSource.fileExtension,
  }

  await options.enqueueSongDownload(enqueuePayload)

  return true
}
