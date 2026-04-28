import { getBuiltinTrackCover } from '../../services/music-metadata/platform-metadata.service.ts'
import { createRendererLogger } from '../../lib/logger.ts'
import { usePlaybackStore } from '../../stores/playback-store.ts'
import { isLocalPlaybackTrack } from './player-lyrics-source.model.ts'
import type { PlaybackTrack } from '../../../shared/playback.ts'

type GetBuiltinTrackCoverFn = (
  track: PlaybackTrack
) => Promise<{ coverUrl: string } | null>

type PatchTrackCoverFn = (trackId: number, coverUrl: string) => void

type EnsureCurrentTrackCoverDeps = {
  getBuiltinTrackCover?: GetBuiltinTrackCoverFn
  patchTrackCover?: PatchTrackCoverFn
  missCache?: Set<string>
}

const coverMissCache = new Set<string>()
const coverLogger = createRendererLogger('cover')

function hasCoverUrl(coverUrl: string | undefined) {
  return Boolean(coverUrl?.trim())
}

function createCoverMissKey(track: PlaybackTrack) {
  const source =
    track.lockedPlatform?.trim() ||
    track.lockedLxSourceId?.trim() ||
    track.lxInfo?.source?.trim() ||
    'wy'

  return `${source}:${track.id}`
}

function readCoverSource(track: PlaybackTrack) {
  return (
    track.lockedPlatform?.trim() ||
    track.lockedLxSourceId?.trim() ||
    track.lxInfo?.source?.trim() ||
    'wy'
  )
}

function patchCurrentTrackCover(trackId: number, coverUrl: string) {
  usePlaybackStore.getState().patchTrackMetadata(trackId, { coverUrl })
}

/**
 * 创建当前播放封面补查器。
 * @returns 一个只在远程歌曲缺封面时触发 provider 补图的函数
 */
export function createEnsureCurrentTrackCover(
  deps: EnsureCurrentTrackCoverDeps = {}
) {
  const getBuiltinTrackCoverImpl =
    deps.getBuiltinTrackCover ?? getBuiltinTrackCover
  const patchTrackCover = deps.patchTrackCover ?? patchCurrentTrackCover
  const missCache = deps.missCache ?? coverMissCache

  return async function ensureCurrentTrackCover(
    currentTrack: PlaybackTrack | null | undefined
  ) {
    if (
      !currentTrack ||
      isLocalPlaybackTrack(currentTrack) ||
      hasCoverUrl(currentTrack.coverUrl)
    ) {
      if (currentTrack) {
        coverLogger.debug('cover resolve skipped', {
          hasCover: hasCoverUrl(currentTrack.coverUrl),
          isLocal: isLocalPlaybackTrack(currentTrack),
          source: readCoverSource(currentTrack),
          trackId: currentTrack.id,
        })
      }
      return
    }

    const missKey = createCoverMissKey(currentTrack)
    if (missCache.has(missKey)) {
      coverLogger.debug('cover resolve skipped', {
        reason: 'miss-cache',
        source: readCoverSource(currentTrack),
        trackId: currentTrack.id,
      })
      return
    }

    try {
      const source = readCoverSource(currentTrack)
      coverLogger.debug('cover resolve start', {
        source,
        trackId: currentTrack.id,
      })

      const result = await getBuiltinTrackCoverImpl(currentTrack)
      const coverUrl = result?.coverUrl?.trim()
      if (!coverUrl) {
        coverLogger.info('cover resolve miss', {
          reason: 'provider-empty',
          source,
          trackId: currentTrack.id,
        })
        missCache.add(missKey)
        return
      }

      patchTrackCover(currentTrack.id, coverUrl)
      coverLogger.info('cover resolve hit', {
        source,
        trackId: currentTrack.id,
      })
    } catch (error) {
      coverLogger.warn('resolve builtin cover failed', {
        error,
        source: readCoverSource(currentTrack),
        trackId: currentTrack.id,
      })
      missCache.add(missKey)
    }
  }
}

export const ensureCurrentTrackCover = createEnsureCurrentTrackCover()
