import type { AudioQualityLevel } from '../../../shared/config.ts'
import type {
  ImportedLxMusicSource,
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
import { createRendererLogger } from '../../lib/logger.ts'
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
const LX_PLAYBACK_FAILURE_DEDUP_WINDOW_MS = 8_000
const lxPlaybackLogger = createRendererLogger('lx-playback')
const recentLxPlaybackFailures = new Map<string, number>()

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function shouldLogLxPlaybackFailure(key: string, now = Date.now()) {
  const lastLoggedAt = recentLxPlaybackFailures.get(key)
  if (
    typeof lastLoggedAt === 'number' &&
    now - lastLoggedAt < LX_PLAYBACK_FAILURE_DEDUP_WINDOW_MS
  ) {
    return false
  }

  recentLxPlaybackFailures.set(key, now)
  for (const [cacheKey, loggedAt] of recentLxPlaybackFailures) {
    if (now - loggedAt >= LX_PLAYBACK_FAILURE_DEDUP_WINDOW_MS) {
      recentLxPlaybackFailures.delete(cacheKey)
    }
  }

  return true
}

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
    hash: resolveLxMusicHash(trackId, source, lxInfo),
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

export function resolveLxPlaybackScriptCandidates(options: {
  scripts: ImportedLxMusicSource[]
  activeScriptId: string
  preferredSource: string
}) {
  const { scripts, activeScriptId, preferredSource } = options
  const activeScript = scripts.find(script => script.id === activeScriptId)
  const remainingScripts = scripts.filter(script => {
    if (script.id === activeScriptId) {
      return false
    }

    return true
  })
  const sourceMatchedScripts = remainingScripts.filter(script => {
    return !script.sources?.length || script.sources.includes(preferredSource)
  })
  const unmatchedScripts = remainingScripts.filter(script => {
    return script.sources?.length && !script.sources.includes(preferredSource)
  })
  const fallbackScripts = [...sourceMatchedScripts, ...unmatchedScripts]

  return activeScript ? [activeScript, ...fallbackScripts] : fallbackScripts
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

function resolveLxMusicHash(
  trackId: string,
  source: string,
  lxInfo: PlaybackTrack['lxInfo']
) {
  if (lxInfo?.hash?.trim()) {
    return lxInfo.hash.trim()
  }

  if (!lxInfo) {
    return trackId
  }

  if (source === 'wy') {
    return trackId
  }

  if (source === 'mg' && lxInfo.copyrightId?.trim()) {
    return lxInfo.copyrightId.trim()
  }

  if (lxInfo?.songmid !== undefined && lxInfo.songmid !== null) {
    const platformId = String(lxInfo.songmid).trim()
    return platformId || undefined
  }

  return undefined
}

function resolvePreferredLxSources(
  track: PlaybackTrack,
  musicInfo: LxMusicInfo
) {
  const lockedSource = track.lockedLxSourceId || track.lockedPlatform
  if (lockedSource) {
    return [lockedSource]
  }

  return [musicInfo.source, ...LX_PLAYBACK_SOURCE_PRIORITY]
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

  const musicInfo = toLxMusicInfo(track)
  const preferredSource =
    track.lockedLxSourceId || track.lockedPlatform || musicInfo.source
  const scriptCandidates = resolveLxPlaybackScriptCandidates({
    scripts: config.luoxueMusicSourceScripts,
    activeScriptId,
    preferredSource,
  })

  for (const script of scriptCandidates) {
    const result = await resolveTrackWithLxMusicSourceScript({
      script,
      musicInfo,
      track,
      quality,
    })
    if (result) {
      return result
    }
  }

  return null
}

async function resolveTrackWithLxMusicSourceScript(options: {
  script: ImportedLxMusicSource
  musicInfo: LxMusicInfo
  track: PlaybackTrack
  quality: AudioQualityLevel
}): Promise<SongUrlV1Result | null> {
  const { script, musicInfo, track, quality } = options
  const scriptContent = await window.electronMusicSource.readLxScript(script.id)
  if (!scriptContent) {
    lxPlaybackLogger.warn('LX script content is missing', {
      scriptId: script.id,
      scriptName: script.name,
    })
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
      lxPlaybackLogger.warn('init lx runner failed', {
        error,
        scriptId: script.id,
        scriptName: script.name,
      })
      return null
    }
  }

  const source = selectBestLxSource(
    runner.getSources(),
    resolvePreferredLxSources(track, musicInfo)
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
    const failureKey = [
      script.id,
      source,
      track.id,
      readErrorMessage(error),
    ].join(':')

    if (shouldLogLxPlaybackFailure(failureKey)) {
      lxPlaybackLogger.warn('resolve music url failed', {
        error,
        scriptId: script.id,
        scriptName: script.name,
        source,
        trackId: track.id,
      })
    }
    return null
  }
}
