import { parseFile } from 'music-metadata'

import {
  readEmbeddedLyricTextBundle,
  readEmbeddedTranslatedLyricText,
  readSidecarLrcTextBundle,
} from '../local-library/local-library-lyrics.model.ts'

export type DownloadFilePlaybackMetadata = {
  durationMs: number
  lyricText: string
  translatedLyricText: string
}

const EMPTY_DOWNLOAD_FILE_PLAYBACK_METADATA: DownloadFilePlaybackMetadata = {
  durationMs: 0,
  lyricText: '',
  translatedLyricText: '',
}

const EMPTY_LYRIC_BUNDLE = {
  lrc: '',
  tlyric: '',
}

/** music-metadata 返回秒，这里转换成播放器内部统一使用的毫秒。 */
function normalizeDurationMs(durationSeconds: number | undefined) {
  if (!Number.isFinite(durationSeconds)) {
    return 0
  }

  return Math.max(0, Math.round((durationSeconds ?? 0) * 1000))
}

/**
 * 读取下载文件的播放元数据，优先同名 .lrc，再回退到文件内嵌标签。
 * @param targetPath 已下载音频文件路径
 * @returns 播放器可直接消费的时长与歌词文本
 */
export async function readDownloadFilePlaybackMetadata(targetPath: string) {
  const trimmedPath = targetPath.trim()
  if (!trimmedPath) {
    return EMPTY_DOWNLOAD_FILE_PLAYBACK_METADATA
  }

  const [metadata, sidecarLyricBundle] = await Promise.all([
    parseFile(trimmedPath, { skipPostHeaders: true }).catch(() => null),
    readSidecarLrcTextBundle(trimmedPath).catch(() => EMPTY_LYRIC_BUNDLE),
  ])

  const embeddedLyricBundle = readEmbeddedLyricTextBundle(
    metadata?.common.lyrics
  )
  const embeddedTranslatedLyricText = readEmbeddedTranslatedLyricText(
    (metadata?.native ?? {}) as Parameters<
      typeof readEmbeddedTranslatedLyricText
    >[0]
  )

  return {
    durationMs: normalizeDurationMs(metadata?.format.duration),
    lyricText: sidecarLyricBundle.lrc || embeddedLyricBundle.lrc,
    translatedLyricText:
      sidecarLyricBundle.tlyric ||
      embeddedLyricBundle.tlyric ||
      embeddedTranslatedLyricText,
  } satisfies DownloadFilePlaybackMetadata
}
