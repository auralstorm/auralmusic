import { useEffect } from 'react'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  PLAYBACK_UNAVAILABLE_MESSAGE,
  shouldSyncPlaybackProgressFrame,
  advancePlaybackAfterTrackEnd,
  shouldApplyRuntimePlaybackProgress,
} from './model'
import type { PlaybackEngineAudioEventsOptions } from './types'

export function usePlaybackEngineAudioEvents({
  playbackSpeedRef,
  volumeRef,
}: PlaybackEngineAudioEventsOptions) {
  useEffect(() => {
    const audio = playbackRuntime.getAudioElement()
    audio.preload = 'auto'
    playbackRuntime.setVolume(volumeRef.current / 100)
    playbackRuntime.setPlaybackRate(playbackSpeedRef.current)

    let frameId = 0
    let lastProgressSyncTimestamp = 0

    const stopProgressSync = () => {
      if (!frameId) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = 0
      lastProgressSyncTimestamp = 0
    }

    const syncProgress = (frameTimestamp: number) => {
      frameId = 0

      if (audio.paused || audio.ended) {
        return
      }

      const playbackState = usePlaybackStore.getState()
      if (
        !shouldApplyRuntimePlaybackProgress({
          status: playbackState.status,
          audioPaused: audio.paused,
          audioEnded: audio.ended,
        })
      ) {
        frameId = requestAnimationFrame(syncProgress)
        return
      }

      if (
        shouldSyncPlaybackProgressFrame({
          lastSyncTimestamp: lastProgressSyncTimestamp,
          frameTimestamp,
        })
      ) {
        playbackState.setProgress(audio.currentTime * 1000)
        lastProgressSyncTimestamp = frameTimestamp
      }

      frameId = requestAnimationFrame(syncProgress)
    }

    const startProgressSync = () => {
      if (frameId) {
        return
      }

      frameId = requestAnimationFrame(syncProgress)
    }

    const handleTimeUpdate = () => {
      const playbackState = usePlaybackStore.getState()
      if (
        (audio.paused || audio.ended) &&
        shouldApplyRuntimePlaybackProgress({
          status: playbackState.status,
          audioPaused: audio.paused,
          audioEnded: audio.ended,
        })
      ) {
        playbackState.setProgress(audio.currentTime * 1000)
      }
    }

    const handleDurationChange = () => {
      const durationMs = Number.isFinite(audio.duration)
        ? Math.max(0, audio.duration * 1000)
        : 0

      usePlaybackStore.getState().setDuration(durationMs)
    }

    const handleEnded = () => {
      stopProgressSync()
      advancePlaybackAfterTrackEnd(usePlaybackStore.getState())
    }

    const handleError = () => {
      stopProgressSync()
      usePlaybackStore
        .getState()
        .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('loadedmetadata', handleDurationChange)
    audio.addEventListener('play', startProgressSync)
    audio.addEventListener('playing', startProgressSync)
    audio.addEventListener('pause', stopProgressSync)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      stopProgressSync()
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('loadedmetadata', handleDurationChange)
      audio.removeEventListener('play', startProgressSync)
      audio.removeEventListener('playing', startProgressSync)
      audio.removeEventListener('pause', stopProgressSync)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [playbackSpeedRef, volumeRef])
}
