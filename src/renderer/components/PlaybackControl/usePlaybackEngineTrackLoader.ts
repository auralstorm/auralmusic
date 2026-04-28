import { useEffect } from 'react'
import { toast } from 'sonner'
import { playbackRuntime } from '@/audio/playback-runtime/playback-runtime'
import { createRendererLogger } from '@/lib/logger'
import { resolvePlaybackSource } from '@/services/music-source/playback-source-resolver.ts'
import { usePlaybackStore } from '@/stores/playback-store'
import {
  OUTPUT_DEVICE_UNAVAILABLE_MESSAGE,
  PLAYBACK_UNAVAILABLE_MESSAGE,
  STALE_PLAYBACK_REQUEST,
  applyPersistedProgress,
  canStartPlaybackSourceLoad,
  isPlaybackRequestStale,
  throwIfPlaybackRequestStale,
} from './model'
import type { PlaybackEngineTrackLoaderOptions } from './types'

const playbackLogger = createRendererLogger('playback-engine')

function getPlaybackRequestSnapshot() {
  const latestState = usePlaybackStore.getState()

  return {
    requestId: latestState.requestId,
    currentTrackId: latestState.currentTrack?.id ?? null,
  }
}

export function usePlaybackEngineTrackLoader({
  volumeRef,
  configRef,
  qualityRef,
  equalizerRef,
  currentPlaybackSourceRef,
  playbackSpeedRef,
  audioOutputDeviceIdRef,
  currentTrack,
  requestId,
  configLoading,
}: PlaybackEngineTrackLoaderOptions) {
  useEffect(() => {
    if (
      !canStartPlaybackSourceLoad({
        hasCurrentTrack: Boolean(currentTrack),
        requestId,
        configLoading,
      })
    ) {
      return
    }

    if (!currentTrack) {
      return
    }

    let cancelled = false
    const expectedRequestId = requestId
    const track = currentTrack
    const expectedTrackId = track.id

    // 播放链路跨越解析、缓存、设备切换和自动播放，每个 await 后都要校验请求是否仍然有效。
    const loadAndPlay = async () => {
      if (usePlaybackStore.getState().shouldAutoPlayOnLoad) {
        usePlaybackStore.getState().markPlaybackLoading()
      }

      if (currentPlaybackSourceRef.current) {
        await playbackRuntime.pauseWithFade()
      } else {
        playbackRuntime.stop()
      }
      currentPlaybackSourceRef.current = null

      try {
        let result = null
        const localSourceUrl = track.sourceUrl?.trim()

        if (localSourceUrl) {
          result = {
            id: track.id,
            url: localSourceUrl,
            time: 0,
            br: 0,
          }
        }

        if (!result) {
          result = await resolvePlaybackSource({
            track,
            config: {
              ...configRef.current,
              quality: qualityRef.current,
            },
          })

          throwIfPlaybackRequestStale(
            expectedRequestId,
            expectedTrackId,
            cancelled,
            getPlaybackRequestSnapshot()
          )
        }

        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled,
          getPlaybackRequestSnapshot()
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
            const cacheKey = `audio:${track.id}:${qualityRef.current}:${result.url}`
            resolvedAudioCacheKey = cacheKey
            // 均衡器需要可 seek 的本地/代理音频源，必要时强制刷新缓存以避开远端流兼容问题。
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
              cancelled,
              getPlaybackRequestSnapshot()
            )
            resolvedAudioUrl = cachedResult.url || result.url
          } catch (error) {
            if (error === STALE_PLAYBACK_REQUEST) {
              throw error
            }
            playbackLogger.warn('resolve cached audio source failed', {
              error,
              trackId: track.id,
            })
          }
        }

        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled,
          getPlaybackRequestSnapshot()
        )
        await playbackRuntime.loadSource(resolvedAudioUrl)
        currentPlaybackSourceRef.current = {
          trackId: track.id,
          sourceUrl: result.url,
          loadedUrl: resolvedAudioUrl,
          cacheKey: resolvedAudioCacheKey,
        }
        const audio = playbackRuntime.getAudioElement()
        playbackRuntime.setVolume(volumeRef.current / 100)
        playbackRuntime.setPlaybackRate(playbackSpeedRef.current)
        const resolvedDuration = result.time || track.duration
        if (resolvedDuration > 0) {
          latestState.setDuration(resolvedDuration)
        }

        const restoreProgress = latestState.pendingRestoreProgress
        if (restoreProgress > 0) {
          try {
            // 恢复进度必须等音频元数据就绪，否则部分浏览器内核会忽略 currentTime 写入。
            await applyPersistedProgress(audio, restoreProgress)
            throwIfPlaybackRequestStale(
              expectedRequestId,
              expectedTrackId,
              cancelled,
              getPlaybackRequestSnapshot()
            )
            usePlaybackStore.getState().setProgress(restoreProgress)
          } catch (error) {
            if (error === STALE_PLAYBACK_REQUEST) {
              throw error
            }
            playbackLogger.warn('restore playback progress failed', {
              error,
              restoreProgress,
              trackId: track.id,
            })
            usePlaybackStore.getState().setProgress(0)
          } finally {
            if (
              !isPlaybackRequestStale(
                expectedRequestId,
                expectedTrackId,
                cancelled,
                getPlaybackRequestSnapshot()
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
            cancelled,
            getPlaybackRequestSnapshot()
          )
          if (!outputApplied) {
            toast.error(OUTPUT_DEVICE_UNAVAILABLE_MESSAGE)
          }
        } catch (error) {
          if (error === STALE_PLAYBACK_REQUEST) {
            throw error
          }
          playbackLogger.warn('apply audio output device failed', {
            error,
            trackId: track.id,
          })
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
          cancelled,
          getPlaybackRequestSnapshot()
        )
        await playbackRuntime.playWithFade()
        throwIfPlaybackRequestStale(
          expectedRequestId,
          expectedTrackId,
          cancelled,
          getPlaybackRequestSnapshot()
        )
        usePlaybackStore.getState().markPlaybackPlaying()
      } catch (error) {
        if (
          error === STALE_PLAYBACK_REQUEST ||
          isPlaybackRequestStale(
            expectedRequestId,
            expectedTrackId,
            cancelled,
            getPlaybackRequestSnapshot()
          )
        ) {
          return
        }

        playbackLogger.error('load song url failed', {
          error,
          lockedLxSourceId: track.lockedLxSourceId,
          lockedPlatform: track.lockedPlatform,
          trackId: track.id,
        })
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
  }, [
    audioOutputDeviceIdRef,
    configLoading,
    configRef,
    currentPlaybackSourceRef,
    currentTrack,
    equalizerRef,
    playbackSpeedRef,
    qualityRef,
    requestId,
    volumeRef,
  ])
}
