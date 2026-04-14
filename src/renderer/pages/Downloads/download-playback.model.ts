import type { PlaybackTrack } from '../../../../shared/playback.ts'
import { createLocalMediaUrl } from '../../../shared/local-media.ts'
import type { DownloadTask } from './downloads.types'

function resolveDownloadPlaybackId(task: DownloadTask) {
  const numericSongId =
    typeof task.songId === 'number'
      ? task.songId
      : Number.parseInt(String(task.songId ?? ''), 10)

  if (Number.isFinite(numericSongId) && numericSongId > 0) {
    return numericSongId
  }

  let hash = 0
  for (const character of task.taskId) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0
  }

  return -Math.abs(hash || 1)
}

export function toDownloadTaskFileUrl(targetPath?: string) {
  const trimmedPath = targetPath?.trim()
  if (!trimmedPath) {
    return ''
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmedPath)) {
    return trimmedPath
  }

  return createLocalMediaUrl(trimmedPath)
}

export function buildDownloadTaskPlaybackTrack(
  task: DownloadTask
): PlaybackTrack | null {
  const sourceUrl = toDownloadTaskFileUrl(task.targetPath)
  if (!sourceUrl) {
    return null
  }

  return {
    id: resolveDownloadPlaybackId(task),
    name: task.songName,
    artistNames: task.artistName?.trim() || '本地下载',
    albumName: task.albumName?.trim() || '本地文件',
    coverUrl: task.coverUrl || '',
    duration: 0,
    sourceUrl,
  }
}
