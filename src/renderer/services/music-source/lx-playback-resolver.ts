import type { AudioQualityLevel } from '../../../shared/config.ts'
import type {
  LxInitedData,
  LxMusicInfo,
  LxQuality,
  LxSourceKey,
} from '../../../shared/lx-music-source.ts'
import type {
  PlaybackTrack,
  SongUrlV1Result,
} from '../../../shared/playback.ts'
import { getLxMusicRunner, initLxMusicRunner } from './LxMusicSourceRunner.ts'
import type { LxPlaybackResolverConfig } from '@/types/core'

const AUDIO_QUALITY_TO_LX: Record<AudioQualityLevel, LxQuality> = {
  standard: '128k',
  higher: '320k',
  exhigh: '320k',
  lossless: 'flac',
  hires: 'flac24bit',
  jyeffect: '320k',
  sky: '320k',
  dolby: '320k',
  jymaster: 'flac',
}

const LX_PLAYBACK_SOURCE_PRIORITY: LxSourceKey[] = [
  'wy',
  'kw',
  'kg',
  'tx',
  'mg',
]

export function formatLxInterval(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function toLxMusicInfo(track: PlaybackTrack): LxMusicInfo {
  const trackId = String(track.id)
  const lxInfo = track.lxInfo
  const source =
    track.lockedLxSourceId?.trim() ||
    track.lockedPlatform ||
    lxInfo?.source?.trim() ||
    'wy'

  return {
    songmid: lxInfo?.songmid ?? track.id,
    hash: lxInfo?.hash ?? trackId,
    strMediaMid: lxInfo?.strMediaMid ?? trackId,
    copyrightId: lxInfo?.copyrightId ?? trackId,
    name: track.name,
    singer: track.artistNames,
    album: track.albumName,
    albumId: lxInfo?.albumId,
    source,
    interval: formatLxInterval(track.duration),
    img: track.coverUrl || lxInfo?.img,
  }
}

export function selectBestLxSource(
  sources: LxInitedData['sources'],
  preferred: string[] = LX_PLAYBACK_SOURCE_PRIORITY
) {
  const available = new Set(
    Object.entries(sources)
      .filter(([, source]) => {
        return (
          source?.actions.includes('musicUrl') && source.qualitys.length > 0
        )
      })
      .map(([source]) => source)
  )

  for (const source of preferred) {
    if (available.has(source)) {
      return source
    }
  }

  return null
}

function mapAudioQualityLevelToLxQuality(
  quality: AudioQualityLevel
): LxQuality {
  return AUDIO_QUALITY_TO_LX[quality] || '320k'
}

function resolveRequestedLxQuality(
  track: PlaybackTrack,
  quality: AudioQualityLevel
): LxQuality {
  return track.preferredQuality ?? mapAudioQualityLevelToLxQuality(quality)
}

export async function resolveTrackWithLxMusicSource(options: {
  track: PlaybackTrack
  quality: AudioQualityLevel
  config: LxPlaybackResolverConfig
}): Promise<SongUrlV1Result | null> {
  const { track, quality, config } = options

  if (!config.musicSourceEnabled || !config.luoxueSourceEnabled) {
    return null
  }

  const activeScriptId = config.activeLuoxueMusicSourceScriptId
  if (!activeScriptId) {
    return null
  }

  const activeScript = config.luoxueMusicSourceScripts.find(
    script => script.id === activeScriptId
  )
  if (!activeScript) {
    return null
  }

  const scriptContent = await window.electronMusicSource.readLxScript(
    activeScript.id
  )
  if (!scriptContent) {
    console.warn('[LxPlaybackResolver] active LX script content is missing')
    return null
  }

  let runner = getLxMusicRunner()
  if (
    !runner ||
    !runner.isInitialized() ||
    !runner.matchesScript(scriptContent)
  ) {
    try {
      runner = await initLxMusicRunner(scriptContent)
    } catch (error) {
      console.warn('[LxPlaybackResolver] init lx runner failed', error)
      return null
    }
  }

  const musicInfo = toLxMusicInfo(track)
  const source = selectBestLxSource(
    runner.getSources(),
    track.lockedLxSourceId || track.lockedPlatform
      ? [
          track.lockedLxSourceId ?? track.lockedPlatform!,
          ...LX_PLAYBACK_SOURCE_PRIORITY,
        ]
      : [musicInfo.source, ...LX_PLAYBACK_SOURCE_PRIORITY]
  )
  if (!source) {
    return null
  }

  try {
    const url = await runner.getMusicUrl(
      source,
      musicInfo,
      resolveRequestedLxQuality(track, quality)
    )

    return {
      id: track.id,
      url,
      time: track.duration,
      br: 0,
    }
  } catch (error) {
    console.warn('[LxPlaybackResolver] resolve music url failed', error)
    return null
  }
}
