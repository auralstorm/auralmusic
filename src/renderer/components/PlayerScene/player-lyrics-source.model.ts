import { isLocalMediaUrl } from '../../../shared/local-media.ts'
import type { PlaybackTrack } from '../../../shared/playback.ts'
import { normalizeBuiltinPlatformSource } from '../../services/music-metadata/platform-metadata.utils.ts'
import type { LyricTextBundle } from './types'

export function isLocalPlaybackTrack(track: PlaybackTrack | null | undefined) {
  return Boolean(track?.sourceUrl && isLocalMediaUrl(track.sourceUrl))
}

export function resolveLocalPlaybackLyricTextBundle(
  track: PlaybackTrack | null | undefined
): LyricTextBundle | null {
  if (!track || !isLocalPlaybackTrack(track)) {
    return null
  }

  if (!track.lyricText && !track.translatedLyricText) {
    return null
  }

  // 本地歌曲优先使用本地库和文件里的歌词，避免误把负数 trackId 打到远端接口。
  return {
    lrc: track.lyricText ?? '',
    tlyric: track.translatedLyricText ?? '',
    yrc: '',
  }
}

export function resolveRemotePlaybackLyricSourceId(
  track: PlaybackTrack | null | undefined
) {
  if (!track || isLocalPlaybackTrack(track)) {
    return null
  }

  const sourceId =
    track.lockedLxSourceId?.trim() ||
    track.lockedPlatform?.trim() ||
    track.lxInfo?.source?.trim() ||
    ''

  const normalizedSourceId = normalizeBuiltinPlatformSource(sourceId)
  if (!normalizedSourceId || normalizedSourceId === 'wy') {
    return null
  }

  return normalizedSourceId
}
