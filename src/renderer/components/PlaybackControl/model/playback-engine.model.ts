import type {
  PendingTrackAudio,
  PlaybackRequestSnapshot,
  ProgressRestorableAudio,
} from '../types'

export const PLAYBACK_UNAVAILABLE_MESSAGE = '鏆傛椂鏃犳硶鎾斁'
export const OUTPUT_DEVICE_UNAVAILABLE_MESSAGE = '闊抽杈撳嚭璁惧鍒囨崲澶辫触'
export const STALE_PLAYBACK_REQUEST = Symbol('STALE_PLAYBACK_REQUEST')

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
