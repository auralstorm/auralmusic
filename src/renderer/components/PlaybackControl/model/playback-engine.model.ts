import type {
  PendingTrackAudio,
  PlaybackRequestSnapshot,
  ProgressRestorableAudio,
} from '../types'

export const PLAYBACK_UNAVAILABLE_MESSAGE = '暂时无法播放这首歌曲'
export const OUTPUT_DEVICE_UNAVAILABLE_MESSAGE = '音频输出设备切换失败'
export const STALE_PLAYBACK_REQUEST = Symbol('STALE_PLAYBACK_REQUEST')
export const PLAYBACK_PROGRESS_SYNC_INTERVAL_MS = 1000 / 30

/** 清空待播音源，确保下一首歌不会继承上一首的解码缓冲。 */
export function prepareAudioForPendingTrack(audio: PendingTrackAudio) {
  audio.pause()
  audio.removeAttribute('src')
  audio.currentTime = 0
  audio.load()
}

export function advancePlaybackAfterTrackEnd(playback: {
  playNext: (reason: 'auto') => boolean
}) {
  playback.playNext('auto')
}

export function shouldSyncPlaybackProgressFrame({
  lastSyncTimestamp,
  frameTimestamp,
}: {
  lastSyncTimestamp: number
  frameTimestamp: number
}) {
  if (!Number.isFinite(lastSyncTimestamp) || lastSyncTimestamp <= 0) {
    return true
  }

  if (!Number.isFinite(frameTimestamp)) {
    return false
  }

  return (
    frameTimestamp - lastSyncTimestamp >= PLAYBACK_PROGRESS_SYNC_INTERVAL_MS
  )
}

export function shouldApplyRuntimePlaybackProgress(input: {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  audioPaused: boolean
  audioEnded: boolean
}) {
  if (input.status === 'loading') {
    return false
  }

  if (input.audioEnded) {
    return false
  }

  if (input.audioPaused) {
    return true
  }

  return input.status === 'playing'
}

export function canStartPlaybackSourceLoad({
  hasCurrentTrack,
  requestId,
  configLoading,
}: {
  hasCurrentTrack: boolean
  requestId: number
  configLoading: boolean
}) {
  return hasCurrentTrack && requestId > 0 && !configLoading
}

export function shouldResumePlaybackTransport(input: {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'error'
  hasSource: boolean
  audioPaused: boolean
  hasPendingPauseIntent: boolean
}) {
  if (input.status !== 'playing' || !input.hasSource) {
    return false
  }

  return input.audioPaused || input.hasPendingPauseIntent
}

export async function applyPersistedProgress(
  audio: ProgressRestorableAudio,
  progressMs: number
) {
  if (!Number.isFinite(progressMs) || progressMs <= 0) {
    return
  }

  const nextTime = progressMs / 1000

  if (audio.readyState < 1) {
    await new Promise<void>((resolve, reject) => {
      const handleLoadedMetadata = () => {
        cleanup()
        resolve()
      }

      const handleError = () => {
        cleanup()
        reject(new Error('failed to load audio metadata'))
      }

      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audio.removeEventListener('error', handleError)
      }

      audio.addEventListener('loadedmetadata', handleLoadedMetadata, {
        once: true,
      })
      audio.addEventListener('error', handleError, {
        once: true,
      })
    })
  }

  audio.currentTime = nextTime
}

/** 判断异步播放请求是否已被新曲目或组件卸载淘汰。 */
export function isPlaybackRequestStale(
  expectedRequestId: number,
  expectedTrackId: number,
  cancelled: boolean,
  snapshot: PlaybackRequestSnapshot
) {
  if (cancelled) {
    return true
  }

  return (
    snapshot.requestId !== expectedRequestId ||
    snapshot.currentTrackId !== expectedTrackId
  )
}

export function throwIfPlaybackRequestStale(
  expectedRequestId: number,
  expectedTrackId: number,
  cancelled: boolean,
  snapshot: PlaybackRequestSnapshot
) {
  if (
    isPlaybackRequestStale(
      expectedRequestId,
      expectedTrackId,
      cancelled,
      snapshot
    )
  ) {
    throw STALE_PLAYBACK_REQUEST
  }
}
