import { useEffect } from 'react'
import { toast } from 'sonner'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { isEqualizerGraphCompatibleSourceUrl } from '@/audio/playback-runtime/playback-runtime.model'
import {
  applyPlaybackSpeedToAudio,
  normalizePlaybackSpeedValue,
} from '@/pages/Settings/components/playback-speed.model'
import {
  OUTPUT_DEVICE_UNAVAILABLE_MESSAGE,
  applyPersistedProgress,
} from './model'
import type { PlaybackEngineRuntimeSyncOptions } from './types'

export function usePlaybackEngineRuntimeSync({
  volumeRef,
  configRef,
  qualityRef,
  equalizerRef,
  currentPlaybackSourceRef,
  playbackSpeedRef,
  audioOutputDeviceIdRef,
  config,
  quality,
  equalizer,
  playbackSpeed,
  volume,
  audioOutputDeviceId,
}: PlaybackEngineRuntimeSyncOptions) {
  useEffect(() => {
    configRef.current = config
  }, [config, configRef])

  useEffect(() => {
    qualityRef.current = quality
  }, [quality, qualityRef])

  useEffect(() => {
    equalizerRef.current = equalizer
    let cancelled = false

    const ensureEqualizerCompatibleCurrentSource = async () => {
      const source = currentPlaybackSourceRef.current
      if (
        !source ||
        !source.cacheKey ||
        isEqualizerGraphCompatibleSourceUrl(source.loadedUrl)
      ) {
        return
      }

      try {
        const cachedResult = await window.electronCache.resolveAudioSource(
          source.cacheKey,
          source.sourceUrl,
          { force: true }
        )
        if (cancelled || currentPlaybackSourceRef.current !== source) {
          return
        }

        const nextUrl = cachedResult.url || source.sourceUrl
        if (!isEqualizerGraphCompatibleSourceUrl(nextUrl)) {
          return
        }

        const audio = playbackRuntime.getAudioElement()
        const wasPlaying = !audio.paused
        const progressMs = Number.isFinite(audio.currentTime)
          ? audio.currentTime * 1000
          : 0

        await playbackRuntime.loadSource(nextUrl)
        currentPlaybackSourceRef.current = {
          ...source,
          loadedUrl: nextUrl,
        }

        if (progressMs > 0) {
          await applyPersistedProgress(
            playbackRuntime.getAudioElement(),
            progressMs
          )
        }

        if (wasPlaying) {
          await playbackRuntime.play()
        }
      } catch (error) {
        console.error('resolve equalizer compatible audio source failed', error)
      }
    }

    const applyEqualizer = async () => {
      if (equalizer.enabled) {
        await ensureEqualizerCompatibleCurrentSource()
      }

      if (!cancelled) {
        playbackRuntime.applyEqualizer(equalizer)
      }
    }

    void applyEqualizer()

    return () => {
      cancelled = true
    }
  }, [currentPlaybackSourceRef, equalizer, equalizerRef])

  useEffect(() => {
    const normalizedPlaybackSpeed = normalizePlaybackSpeedValue(playbackSpeed)
    playbackSpeedRef.current = normalizedPlaybackSpeed

    const audio = playbackRuntime.getAudioElement()
    applyPlaybackSpeedToAudio(audio, normalizedPlaybackSpeed)
    playbackRuntime.setPlaybackRate(normalizedPlaybackSpeed)
  }, [playbackSpeed, playbackSpeedRef])

  useEffect(() => {
    volumeRef.current = volume
    playbackRuntime.setVolume(volume / 100)
  }, [volume, volumeRef])

  useEffect(() => {
    audioOutputDeviceIdRef.current = audioOutputDeviceId

    void playbackRuntime.setOutputDevice(audioOutputDeviceId).then(applied => {
      if (applied) {
        return
      }

      toast.error(OUTPUT_DEVICE_UNAVAILABLE_MESSAGE)
    })
  }, [audioOutputDeviceId, audioOutputDeviceIdRef])
}
