import { useConfigStore } from '../../stores/config-store.ts'
import { usePlaybackStore } from '../../stores/playback-store.ts'
import { createRendererLogger } from '../../lib/logger.ts'
import { parseLocalMediaUrl } from '../../../shared/local-media.ts'
import { getBuiltinTrackLyric } from '../../services/music-metadata/platform-metadata.service.ts'
import { shouldFallbackBuiltinMetadata } from '../../services/music-metadata/platform-metadata-fallback.service.ts'
import {
  createLyricCacheKey,
  hasLyricTextBundle,
  readLyricTextBundle,
} from './player-lyrics.data.ts'
import {
  isLocalPlaybackTrack,
  resolveRemotePlaybackLyricSourceId,
  resolveLocalPlaybackLyricTextBundle,
} from './player-lyrics-source.model.ts'
import type { LyricTextBundle } from './types/index.ts'
import type { PlaybackTrack } from '../../../shared/playback.ts'

const EMPTY_LYRIC_BUNDLE: LyricTextBundle = {
  lrc: '',
  tlyric: '',
  yrc: '',
}
const localLyricBundleCache = new Map<string, LyricTextBundle>()
const localLyricMissCache = new Set<string>()
const lyricLogger = createRendererLogger('lyrics')

type ReadCachedLyricPayloadFn = (cacheKey: string) => Promise<unknown | null>
type WriteLyricPayloadFn = (cacheKey: string, payload: unknown) => void
type GetBuiltinTrackLyricFn = (track: PlaybackTrack) => Promise<{
  lyric: string
  translatedLyric?: string
  yrc?: string
} | null>
type MatchOnlineLocalTrackMetadataFn = (
  currentTrack: PlaybackTrack,
  fallbackBundle: LyricTextBundle
) => Promise<LyricTextBundle>

type PlayerLyricServiceDeps = {
  readCachedLyricPayload?: ReadCachedLyricPayloadFn
  writeLyricPayload?: WriteLyricPayloadFn
  getBuiltinTrackLyric?: GetBuiltinTrackLyricFn
  matchOnlineLocalTrackMetadata?: MatchOnlineLocalTrackMetadataFn
}

function hasLyricBundle(bundle: LyricTextBundle) {
  return Boolean(bundle.lrc.trim() || bundle.tlyric.trim())
}

function hasCoverUrl(coverUrl: string | undefined) {
  return Boolean(coverUrl?.trim())
}

function readTrackLyricSource(currentTrack: PlaybackTrack | null | undefined) {
  if (!currentTrack) {
    return 'unknown'
  }

  if (isLocalPlaybackTrack(currentTrack)) {
    return 'local'
  }

  return resolveRemotePlaybackLyricSourceId(currentTrack) ?? 'wy'
}

function readBundleState(bundle: LyricTextBundle) {
  return {
    hasLrc: Boolean(bundle.lrc.trim()),
    hasTranslatedLyric: Boolean(bundle.tlyric.trim()),
    hasYrc: Boolean(bundle.yrc.trim()),
  }
}

async function readCachedLyricPayload(cacheKey: string) {
  try {
    const cachedPayload = await window.electronCache.readLyricsPayload(cacheKey)
    if (!cachedPayload) {
      return null
    }

    const parsedPayload = JSON.parse(cachedPayload)
    return hasLyricTextBundle(readLyricTextBundle(parsedPayload))
      ? parsedPayload
      : null
  } catch (error) {
    lyricLogger.warn('read lyric cache failed', { cacheKey, error })
    return null
  }
}

function writeLyricPayload(cacheKey: string, payload: unknown) {
  void window.electronCache
    .writeLyricsPayload(cacheKey, payload)
    .catch(error => {
      lyricLogger.warn('write lyric cache failed', { cacheKey, error })
    })
}

function patchMatchedLocalTrackMetadata(
  currentTrack: PlaybackTrack,
  matchedLyrics: {
    lyricText: string
    translatedLyricText: string
    coverUrl: string
  }
) {
  const patch: Partial<
    Pick<PlaybackTrack, 'coverUrl' | 'lyricText' | 'translatedLyricText'>
  > = {}

  if (
    matchedLyrics.coverUrl.trim() &&
    matchedLyrics.coverUrl !== currentTrack.coverUrl
  ) {
    patch.coverUrl = matchedLyrics.coverUrl
  }

  if (
    matchedLyrics.lyricText &&
    matchedLyrics.lyricText !== currentTrack.lyricText
  ) {
    patch.lyricText = matchedLyrics.lyricText
  }

  if (
    matchedLyrics.translatedLyricText &&
    matchedLyrics.translatedLyricText !== currentTrack.translatedLyricText
  ) {
    patch.translatedLyricText = matchedLyrics.translatedLyricText
  }

  if (Object.keys(patch).length === 0) {
    return
  }

  // 在线补词/补封面后同步更新当前播放态，避免用户必须切歌才能看到最新元数据。
  usePlaybackStore.getState().patchTrackMetadata(currentTrack.id, patch)
}

async function matchOnlineLocalTrackMetadata(
  currentTrack: PlaybackTrack,
  fallbackBundle: LyricTextBundle
) {
  const filePath = parseLocalMediaUrl(currentTrack.sourceUrl ?? '')
  if (!filePath) {
    lyricLogger.debug('local lyric online match skipped', {
      reason: 'invalid-local-media-url',
      source: 'local',
      trackId: currentTrack.id,
    })
    return fallbackBundle
  }

  const needsCoverMatch = !currentTrack.coverUrl.trim()
  const needsLyricMatch = !hasLyricBundle(fallbackBundle)

  if (!needsCoverMatch && localLyricBundleCache.has(filePath)) {
    return localLyricBundleCache.get(filePath) ?? fallbackBundle
  }

  if (!needsCoverMatch && !needsLyricMatch) {
    lyricLogger.debug('local lyric online match skipped', {
      reason: 'metadata-complete',
      source: 'local',
      trackId: currentTrack.id,
    })
    return fallbackBundle
  }

  if (
    localLyricMissCache.has(filePath) ||
    !useConfigStore.getState().config.localLibraryOnlineLyricMatchEnabled
  ) {
    lyricLogger.debug('local lyric online match skipped', {
      reason: localLyricMissCache.has(filePath)
        ? 'miss-cache'
        : 'setting-disabled',
      source: 'local',
      trackId: currentTrack.id,
    })
    return fallbackBundle
  }

  try {
    const matchedLyrics = await window.electronLocalLibrary?.matchOnlineLyrics({
      filePath,
      title: currentTrack.name,
      artistName: currentTrack.artistNames,
      albumName: currentTrack.albumName,
      durationMs: currentTrack.duration,
      coverUrl: currentTrack.coverUrl,
    })

    if (
      !matchedLyrics?.lyricText &&
      !matchedLyrics?.translatedLyricText &&
      !matchedLyrics?.coverUrl?.trim()
    ) {
      lyricLogger.info('local lyric online match miss', {
        source: 'local',
        trackId: currentTrack.id,
      })
      localLyricMissCache.add(filePath)
      return fallbackBundle
    }

    patchMatchedLocalTrackMetadata(currentTrack, matchedLyrics)

    if (!matchedLyrics?.lyricText && !matchedLyrics?.translatedLyricText) {
      return fallbackBundle
    }

    const nextBundle = {
      lrc: matchedLyrics.lyricText,
      tlyric: matchedLyrics.translatedLyricText,
      yrc: '',
    }
    localLyricBundleCache.set(filePath, nextBundle)
    lyricLogger.info('local lyric online match hit', {
      ...readBundleState(nextBundle),
      hasCover: Boolean(matchedLyrics.coverUrl?.trim()),
      source: 'local',
      trackId: currentTrack.id,
    })
    return nextBundle
  } catch (error) {
    lyricLogger.warn('match local online lyrics failed', {
      error,
      source: 'local',
      trackId: currentTrack.id,
    })
    localLyricMissCache.add(filePath)
    return fallbackBundle
  }
}

async function fetchRemoteBuiltinLyricTextBundle(
  currentTrack: PlaybackTrack,
  getBuiltinTrackLyricImpl: GetBuiltinTrackLyricFn
): Promise<LyricTextBundle | null> {
  try {
    const result = await getBuiltinTrackLyricImpl(currentTrack)
    if (!result) {
      return null
    }

    const bundle: LyricTextBundle = {
      lrc: result.lyric ?? '',
      tlyric: result.translatedLyric ?? '',
      yrc: result.yrc ?? '',
    }
    return hasLyricTextBundle(bundle) ? bundle : null
  } catch (error) {
    lyricLogger.warn('resolve builtin lyric failed', {
      error,
      source: readTrackLyricSource(currentTrack),
      trackId: currentTrack.id,
    })
    return null
  }
}

export function createFetchLyricTextBundle(deps: PlayerLyricServiceDeps = {}) {
  const readCachedLyricPayloadImpl =
    deps.readCachedLyricPayload ?? readCachedLyricPayload
  const writeLyricPayloadImpl = deps.writeLyricPayload ?? writeLyricPayload
  const getBuiltinTrackLyricImpl =
    deps.getBuiltinTrackLyric ?? getBuiltinTrackLyric
  const matchOnlineLocalTrackMetadataImpl =
    deps.matchOnlineLocalTrackMetadata ?? matchOnlineLocalTrackMetadata

  return async function fetchLyricTextBundle(
    trackId: number | string,
    currentTrack?: PlaybackTrack | null
  ): Promise<LyricTextBundle> {
    const localLyricBundle = resolveLocalPlaybackLyricTextBundle(currentTrack)
    const source = readTrackLyricSource(currentTrack)

    lyricLogger.debug('lyrics resolve start', {
      hasEmbeddedLyric: Boolean(localLyricBundle),
      isLocal: source === 'local',
      source,
      trackId,
    })

    if (currentTrack && isLocalPlaybackTrack(currentTrack)) {
      if (localLyricBundle) {
        lyricLogger.info('lyrics resolve hit', {
          ...readBundleState(localLyricBundle),
          source: 'local-embedded',
          trackId,
        })

        if (!hasCoverUrl(currentTrack.coverUrl)) {
          // 已有本地歌词时后台补封面，避免为了补图阻塞当前歌词展示。
          void matchOnlineLocalTrackMetadataImpl(currentTrack, localLyricBundle)
        }

        return localLyricBundle
      }

      return matchOnlineLocalTrackMetadataImpl(currentTrack, EMPTY_LYRIC_BUNDLE)
    }

    if (localLyricBundle) {
      lyricLogger.info('lyrics resolve hit', {
        ...readBundleState(localLyricBundle),
        source: 'track-embedded',
        trackId,
      })
      return localLyricBundle
    }

    const lyricSourceId =
      resolveRemotePlaybackLyricSourceId(currentTrack) ?? 'wy'
    const cacheKey = createLyricCacheKey(trackId, lyricSourceId)
    const cachedPayload = await readCachedLyricPayloadImpl(cacheKey)
    if (cachedPayload) {
      const cachedBundle = readLyricTextBundle(cachedPayload)
      lyricLogger.debug('lyrics cache hit', {
        ...readBundleState(cachedBundle),
        cacheKey,
        source: lyricSourceId,
        trackId,
      })
      return cachedBundle
    }

    if (!currentTrack) {
      lyricLogger.info('lyrics resolve miss', {
        reason: 'missing-track',
        source: lyricSourceId,
        trackId,
      })
      return EMPTY_LYRIC_BUNDLE
    }

    const builtinBundle = await fetchRemoteBuiltinLyricTextBundle(
      currentTrack,
      getBuiltinTrackLyricImpl
    )
    if (builtinBundle) {
      writeLyricPayloadImpl(cacheKey, builtinBundle)
      lyricLogger.info('lyrics resolve hit', {
        ...readBundleState(builtinBundle),
        source: lyricSourceId,
        trackId,
      })
      return builtinBundle
    }

    if (!shouldFallbackBuiltinMetadata('lyric', lyricSourceId)) {
      lyricLogger.info('lyrics resolve miss', {
        reason: 'fallback-disabled',
        source: lyricSourceId,
        trackId,
      })
      return EMPTY_LYRIC_BUNDLE
    }

    lyricLogger.info('lyrics resolve miss', {
      reason: 'provider-empty',
      source: lyricSourceId,
      trackId,
    })
    return EMPTY_LYRIC_BUNDLE
  }
}

export const fetchLyricTextBundle = createFetchLyricTextBundle()

export { resolveLocalPlaybackLyricTextBundle }
