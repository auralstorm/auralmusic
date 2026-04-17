import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { toast } from 'sonner'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { isEqualizerGraphCompatibleSourceUrl } from '@/audio/playback-runtime/playback-runtime.model'
import { resolvePlaybackSource } from '@/services/music-source/playback-source-resolver.ts'
import { useConfigStore } from '@/stores/config-store'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  applyPlaybackSpeedToAudio,
  normalizePlaybackSpeedValue,
} from '@/pages/Settings/components/playback-speed.model'

const PLAYBACK_UNAVAILABLE_MESSAGE = '暂时无法播放'
const OUTPUT_DEVICE_UNAVAILABLE_MESSAGE = '音频输出设备切换失败'

const STALE_PLAYBACK_REQUEST = Symbol('STALE_PLAYBACK_REQUEST')

interface PlaybackEngineRef {
  getAudioElement: () => HTMLAudioElement | null
}

type CurrentPlaybackSource = {
  trackId: number
  sourceUrl: string
  loadedUrl: string
  cacheKey: string | null
}

async function applyPersistedProgress(
  audio: HTMLAudioElement,
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

function isPlaybackRequestStale(
  expectedRequestId: number,
  expectedTrackId: number,
  cancelled: boolean
) {
  if (cancelled) {
    return true
  }

  const latestState = usePlaybackStore.getState()

  return (
    latestState.requestId !== expectedRequestId ||
    latestState.currentTrack?.id !== expectedTrackId
  )
}

function throwIfPlaybackRequestStale(
  expectedRequestId: number,
  expectedTrackId: number,
  cancelled: boolean
) {
  if (isPlaybackRequestStale(expectedRequestId, expectedTrackId, cancelled)) {
    throw STALE_PLAYBACK_REQUEST
  }
}

const PlaybackEngine = forwardRef<PlaybackEngineRef>((_, ref) => {
  const volumeRef = useRef(70)
  const configRef = useRef(useConfigStore.getState().config)
  const qualityRef = useRef(useConfigStore.getState().config.quality)
  const equalizerRef = useRef(useConfigStore.getState().config.equalizer)
  const currentPlaybackSourceRef = useRef<CurrentPlaybackSource | null>(null)
  const playbackSpeedRef = useRef(
    normalizePlaybackSpeedValue(useConfigStore.getState().config.playbackSpeed)
  )
  const audioOutputDeviceIdRef = useRef(
    useConfigStore.getState().config.audioOutputDeviceId
  )

  const currentTrack = usePlaybackStore(state => state.currentTrack)
  const requestId = usePlaybackStore(state => state.requestId)
  const status = usePlaybackStore(state => state.status)
  const volume = usePlaybackStore(state => state.volume)
  const seekRequestId = usePlaybackStore(state => state.seekRequestId)
  const seekPosition = usePlaybackStore(state => state.seekPosition)
  const config = useConfigStore(state => state.config)
  const quality = useConfigStore(state => state.config.quality)
  const playbackSpeed = useConfigStore(state => state.config.playbackSpeed)
  const equalizer = useConfigStore(state => state.config.equalizer)
  const audioOutputDeviceId = useConfigStore(
    state => state.config.audioOutputDeviceId
  )

  useImperativeHandle(
    ref,
    () => ({
      getAudioElement: () => playbackRuntime.getAudioElement(),
    }),
    []
  )

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    qualityRef.current = quality
  }, [quality])

  useEffect(() => {
    equalizerRef.current = equalizer
    let cancelled = false

    const applyEqualizer = async () => {
      if (equalizer.enabled) {
        await ensureEqualizerCompatibleCurrentSource(() => cancelled)
      }

      if (!cancelled) {
        playbackRuntime.applyEqualizer(equalizer)
      }
    }

    void applyEqualizer()

    return () => {
      cancelled = true
    }
  }, [equalizer])

  const ensureEqualizerCompatibleCurrentSource = async (
    isCancelled: () => boolean
  ) => {
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
      if (isCancelled() || currentPlaybackSourceRef.current !== source) {
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

  useEffect(() => {
    const normalizedPlaybackSpeed = normalizePlaybackSpeedValue(playbackSpeed)
    playbackSpeedRef.current = normalizedPlaybackSpeed

    const audio = playbackRuntime.getAudioElement()
    applyPlaybackSpeedToAudio(audio, normalizedPlaybackSpeed)
    playbackRuntime.setPlaybackRate(normalizedPlaybackSpeed)
  }, [playbackSpeed])

  useEffect(() => {
    volumeRef.current = volume
    playbackRuntime.setVolume(volume / 100)
  }, [volume])

  useEffect(() => {
    audioOutputDeviceIdRef.current = audioOutputDeviceId

    void playbackRuntime.setOutputDevice(audioOutputDeviceId).then(applied => {
      if (applied) {
        return
      }

      toast.error(OUTPUT_DEVICE_UNAVAILABLE_MESSAGE)
    })
  }, [audioOutputDeviceId])

  useEffect(() => {
    const audio = playbackRuntime.getAudioElement()
    audio.preload = 'auto'
    playbackRuntime.setVolume(volumeRef.current / 100)
    playbackRuntime.setPlaybackRate(playbackSpeedRef.current)

    let frameId = 0

    const stopProgressSync = () => {
      if (!frameId) {
        return
      }

      cancelAnimationFrame(frameId)
      frameId = 0
    }

    const syncProgress = () => {
      frameId = 0

      if (audio.paused || audio.ended) {
        return
      }

      usePlaybackStore.getState().setProgress(audio.currentTime * 1000)
      frameId = requestAnimationFrame(syncProgress)
    }

    const startProgressSync = () => {
      if (frameId) {
        return
      }

      frameId = requestAnimationFrame(syncProgress)
    }

    const handleTimeUpdate = () => {
      usePlaybackStore.getState().setProgress(audio.currentTime * 1000)
    }

    const handleDurationChange = () => {
      if (Number.isFinite(audio.duration)) {
        usePlaybackStore.getState().setDuration(audio.duration * 1000)
      }
    }

    const handleEnded = () => {
      stopProgressSync()
      const hasNext = usePlaybackStore.getState().playNext('auto')

      if (!hasNext) {
        usePlaybackStore.getState().markPlaybackPaused()
      }
    }

    const handleError = () => {
      stopProgressSync()
      usePlaybackStore
        .getState()
        .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
      toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
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
  }, [])

  useEffect(() => {
    if (!currentTrack || requestId <= 0) {
      return
    }

    let cancelled = false
    const expectedRequestId = requestId
    const expectedTrackId = currentTrack.id

    const loadAndPlay = async () => {
      if (usePlaybackStore.getState().shouldAutoPlayOnLoad) {
        usePlaybackStore.getState().markPlaybackLoading()
      }
      currentPlaybackSourceRef.current = null
      playbackRuntime.stop()

      try {
        let result = null
        const localSourceUrl = currentTrack.sourceUrl?.trim()

        if (localSourceUrl) {
          result = {
            id: currentTrack.id,
            url: localSourceUrl,
            time: 0,
            br: 0,
          }
        }

        if (!result) {
          result = await resolvePlaybackSource({
            track: currentTrack,
            config: {
              ...configRef.current,
              quality: qualityRef.current,
            },
          })

          throwIfPlaybackRequestStale(
            expectedRequestId,
            expectedTrackId,
            cancelled
          )
        }

        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled
        )
        const latestState = usePlaybackStore.getState()

        if (!result?.url) {
          latestState.markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
          toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
          return
        }

        let resolvedAudioUrl = result.url
        let resolvedAudioCacheKey: string | null = null
        if (!localSourceUrl) {
          try {
            const cacheKey = `audio:${currentTrack.id}:${qualityRef.current}:${result.url}`
            resolvedAudioCacheKey = cacheKey
            const cachedResult = await window.electronCache.resolveAudioSource(
              cacheKey,
              result.url,
              {
                force:
                  equalizerRef.current.enabled ||
                  playbackRuntime.requiresEqualizerCompatibleSource(),
              }
            )
            throwIfPlaybackRequestStale(
              expectedRequestId,
              expectedTrackId,
              cancelled
            )
            resolvedAudioUrl = cachedResult.url || result.url
          } catch (error) {
            if (error === STALE_PLAYBACK_REQUEST) {
              throw error
            }
            console.error('resolve cached audio source failed', error)
          }
        }

        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled
        )
        await playbackRuntime.loadSource(resolvedAudioUrl)
        currentPlaybackSourceRef.current = {
          trackId: currentTrack.id,
          sourceUrl: result.url,
          loadedUrl: resolvedAudioUrl,
          cacheKey: resolvedAudioCacheKey,
        }
        const audio = playbackRuntime.getAudioElement()
        playbackRuntime.setVolume(volumeRef.current / 100)
        playbackRuntime.setPlaybackRate(playbackSpeedRef.current)
        latestState.setDuration(result.time || currentTrack.duration)

        const restoreProgress = latestState.pendingRestoreProgress
        if (restoreProgress > 0) {
          try {
            await applyPersistedProgress(audio, restoreProgress)
            throwIfPlaybackRequestStale(
              expectedRequestId,
              expectedTrackId,
              cancelled
            )
            usePlaybackStore.getState().setProgress(restoreProgress)
          } catch (error) {
            if (error === STALE_PLAYBACK_REQUEST) {
              throw error
            }
            console.error('restore playback progress failed', error)
            usePlaybackStore.getState().setProgress(0)
          } finally {
            if (
              !isPlaybackRequestStale(
                expectedRequestId,
                expectedTrackId,
                cancelled
              )
            ) {
              usePlaybackStore.getState().clearPendingRestoreProgress()
            }
          }
        } else {
          latestState.setProgress(0)
        }

        try {
          const outputApplied = await playbackRuntime.setOutputDevice(
            audioOutputDeviceIdRef.current
          )
          throwIfPlaybackRequestStale(
            expectedRequestId,
            expectedTrackId,
            cancelled
          )
          if (!outputApplied) {
            toast.error(OUTPUT_DEVICE_UNAVAILABLE_MESSAGE)
          }
        } catch (error) {
          if (error === STALE_PLAYBACK_REQUEST) {
            throw error
          }
          console.error('apply audio output device failed', error)
          toast.error(OUTPUT_DEVICE_UNAVAILABLE_MESSAGE)
        }

        const currentPlaybackState = usePlaybackStore.getState()

        if (!currentPlaybackState.shouldAutoPlayOnLoad) {
          currentPlaybackState.markPlaybackPaused()
          playbackRuntime.pause()
          return
        }

        if (currentPlaybackState.status === 'paused') {
          playbackRuntime.pause()
          return
        }

        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled
        )
        await playbackRuntime.play()
        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled
        )
        usePlaybackStore.getState().markPlaybackPlaying()
      } catch (error) {
        if (
          error === STALE_PLAYBACK_REQUEST ||
          isPlaybackRequestStale(expectedRequestId, expectedTrackId, cancelled)
        ) {
          return
        }

        console.error('load song url failed', error)
        usePlaybackStore
          .getState()
          .markPlaybackError(PLAYBACK_UNAVAILABLE_MESSAGE)
        toast.error(PLAYBACK_UNAVAILABLE_MESSAGE)
      }
    }

    void loadAndPlay()

    return () => {
      cancelled = true
    }
  }, [currentTrack, requestId])

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
  }, [seekRequestId, seekPosition])

  return null
})

export default PlaybackEngine
