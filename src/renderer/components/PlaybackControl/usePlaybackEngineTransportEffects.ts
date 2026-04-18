import { useEffect } from 'react'
import { toast } from 'sonner'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { usePlaybackStore } from '@/stores/playback-store'
import { PLAYBACK_UNAVAILABLE_MESSAGE } from './model'
import type { PlaybackEngineTransportEffectsOptions } from './types'

export function usePlaybackEngineTransportEffects({
  status,
  seekRequestId,
  seekPosition,
}: PlaybackEngineTransportEffectsOptions) {
  useEffect(() => {
    const audio = playbackRuntime.getAudioElement()

    if (status === 'paused' || status === 'idle' || status === 'error') {
      playbackRuntime.pause()
      return
    }

    if (status === 'playing' && audio.src && audio.paused) {
      void playbackRuntime.play().catch(error => {
        console.error('resume playback failed', error)
        usePlaybackStore
          .getState()
          .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
        toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
      })
    }
  }, [status])

  useEffect(() => {
    if (seekRequestId <= 0) {
      return
    }

    const nextTime = Math.max(0, seekPosition) / 1000

    if (Number.isFinite(nextTime)) {
      try {
        playbackRuntime.seek(nextTime)
        usePlaybackStore.getState().setProgress(seekPosition)
      } catch (error) {
        console.error('seek playback failed', error)
      }
    }
  }, [seekPosition, seekRequestId])
}
